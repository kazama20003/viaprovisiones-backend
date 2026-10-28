import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../../../compartido/infraestructura/prisma/prisma.service';
import { PermisoGuard, RequierePermisos, SesionActual, SesionGuard } from '../../acceso/sesion.guard';
import type { ContextoAutenticado } from '../../acceso/sesion.guard';
import { createHash } from 'node:crypto';
import { claveVariante, combinacionesVariantes } from './variantes';

const estados = ['borrador', 'publicado', 'oculto', 'descontinuado'] as const;

@Controller('productos')
@UseGuards(SesionGuard, PermisoGuard)
export class ProductosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequierePermisos('catalogo.productos.leer')
  async listar(
    @SesionActual() sesion: ContextoAutenticado,
    @Query('buscar') buscar?: string,
  ) {
    const productos = await this.prisma.producto.findMany({
      where: {
        empresaId: sesion.empresaId,
        ...(buscar ? { OR: [
          { nombre: { contains: buscar.trim(), mode: 'insensitive' } },
          { sku: { contains: buscar.trim(), mode: 'insensitive' } },
        ] } : {}),
      },
      orderBy: { creadoEn: 'desc' },
      take: 100,
      include: {
        categoria: { select: { nombre: true } },
        imagenes: { where: { esPrincipal: true }, take: 1, select: { url: true } },
        archivos: { orderBy: { creadoEn: 'asc' }, select: { id: true, tipo: true, mime: true, tamano: true } },
        precios: {
          where: { vigenteDesde: { lte: new Date() }, OR: [{ vigenteHasta: null }, { vigenteHasta: { gt: new Date() } }] },
          orderBy: [{ cantidadMinima: 'asc' }, { vigenteDesde: 'desc' }],
          select: { precioUnitario: true, listaPrecios: { select: { nombre: true } } },
        },
        variantes: { where: { activa: true }, select: { id: true, sku: true, atributos: true, precioPublico: true, lotes: { where: { estado: 'disponible' }, select: { existencias: { select: { cantidadFisica: true, cantidadReservada: true } } } } } },
        historial: { orderBy: { creadoEn: 'desc' }, take: 20, select: { accion: true, creadoEn: true } },
        lotes: {
          select: {
            id: true, codigo: true, varianteId: true, costoUnitario: true, fechaIngreso: true, garantiaHasta: true, estado: true,
            proveedor: { select: { nombre: true } }, variante: { select: { sku: true, atributos: true } },
            existencias: { where: { empresaId: sesion.empresaId }, select: { cantidadFisica: true, cantidadReservada: true, almacen: { select: { id: true, nombre: true, codigo: true } } } },
          },
        },
      },
    });
    return { datos: productos.map((producto) => ({
      id: producto.id,
      sku: producto.sku,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      marca: producto.marca, codigoBarras: producto.codigoBarras, stockMinimo: Number(producto.stockMinimo),
      datosAdicionales: producto.datosAdicionales, historial: producto.historial, categoriaId: producto.categoriaId,
      permiteDelivery: producto.permiteDelivery, permiteAgencia: producto.permiteAgencia, permiteRecojo: producto.permiteRecojo,
      categoria: producto.categoria?.nombre ?? null,
      precio: Number(producto.precios[0]?.precioUnitario ?? 0),
      precios: Object.fromEntries(producto.precios.map(precio => [precio.listaPrecios.nombre, Number(precio.precioUnitario)])),
      imagen: producto.imagenes[0]?.url ?? null,
      archivos: producto.archivos.map(a => ({ ...a, url: `/api/v1/archivos/${a.id}`, principal: producto.imagenes[0]?.url === `/api/v1/archivos/${a.id}` })),
      estado: producto.estado,
      visibleEnTienda: producto.visibleEnTienda,
      destacado: producto.destacado,
      variantes: producto.variantes.map(v => ({ ...v, precioPublico: v.precioPublico === null ? null : Number(v.precioPublico), stock: v.lotes.reduce((s, l) => s + l.existencias.reduce((n, e) => n + Number(e.cantidadFisica) - Number(e.cantidadReservada), 0), 0), lotes: undefined })),
      lotes: producto.lotes.map(lote => ({ ...lote, costoUnitario: Number(lote.costoUnitario), existencias: lote.existencias.map(x => ({ ...x, cantidadFisica: Number(x.cantidadFisica), cantidadReservada: Number(x.cantidadReservada) })) })),
      stockDisponible: producto.lotes.filter(lote => lote.estado === 'disponible').reduce((suma, lote) => suma + lote.existencias.reduce((n, x) => n + Number(x.cantidadFisica) - Number(x.cantidadReservada), 0), 0),
    })) };
  }

  @Post()
  @RequierePermisos('catalogo.productos.crear')
  async crear(@SesionActual() sesion: ContextoAutenticado, @Body() cuerpo: Record<string, unknown>) {
    const nombre = this.texto(cuerpo.nombre, 'nombre', 180);
    const sku = this.texto(cuerpo.sku, 'sku', 60);
    const categoriaId = this.opcionalTexto(cuerpo.categoriaId);
    if (categoriaId) {
      const categoria = await this.prisma.categoria.findFirst({ where: { id: categoriaId, empresaId: sesion.empresaId, activa: true } });
      if (!categoria) throw new BadRequestException('La categoría no pertenece a esta empresa.');
    }
    const extras = this.campos(cuerpo);
    if (typeof extras.marca === 'string' && extras.marca) await this.comprobarMarca(sesion.empresaId, extras.marca);
    const producto = await this.prisma.$transaction(async tx => {
      const categoria = await this.guardarCategoria(tx, sesion.empresaId, cuerpo.categoriaNombre);
      const creado = await tx.producto.create({ data: {
        empresaId: sesion.empresaId,
        nombre,
        sku,
        descripcion: this.opcionalTexto(cuerpo.descripcion),
        categoriaId: categoria ?? categoriaId,
        ...extras,
      }, select: { id: true, sku: true, nombre: true, estado: true, creadoEn: true } });
      await this.guardarPrecios(tx, sesion.empresaId, creado.id, cuerpo.precios);
      await this.guardarVariantes(tx, sesion.empresaId, creado.id, sku, cuerpo.datosAdicionales, cuerpo.preciosVariantes);
      await tx.historialProducto.create({ data: { empresaId: sesion.empresaId, productoId: creado.id, usuarioId: sesion.usuarioId, accion: 'Producto creado' } });
      return creado;
    });
    return { datos: producto };
  }

  @Patch(':id')
  @RequierePermisos('catalogo.productos.editar')
  async actualizar(
    @Param('id') id: string,
    @SesionActual() sesion: ContextoAutenticado,
    @Body() cuerpo: Record<string, unknown>,
  ) {
    const actual = await this.prisma.producto.findFirst({ where: { id, empresaId: sesion.empresaId }, select: { id: true, categoriaId: true, marca: true } });
    if (!actual) throw new NotFoundException('No se encontró el producto.');
    const data: Record<string, unknown> = this.campos(cuerpo);
    if (typeof data.marca === 'string' && data.marca && data.marca !== actual.marca) await this.comprobarMarca(sesion.empresaId, data.marca);
    if ('nombre' in cuerpo) data.nombre = this.texto(cuerpo.nombre, 'nombre', 180);
    if ('sku' in cuerpo) data.sku = this.texto(cuerpo.sku, 'sku', 60);
    if ('descripcion' in cuerpo) data.descripcion = this.opcionalTexto(cuerpo.descripcion);
    if ('visibleEnTienda' in cuerpo) {
      if (typeof cuerpo.visibleEnTienda !== 'boolean') throw new BadRequestException('visibleEnTienda debe ser booleano.');
      data.visibleEnTienda = cuerpo.visibleEnTienda;
    }
    if ('destacado' in cuerpo) {
      if (typeof cuerpo.destacado !== 'boolean') throw new BadRequestException('destacado debe ser booleano.');
      data.destacado = cuerpo.destacado;
    }
    if ('estado' in cuerpo) {
      if (typeof cuerpo.estado !== 'string' || !estados.includes(cuerpo.estado as (typeof estados)[number])) {
        throw new BadRequestException('El estado del producto no es válido.');
      }
      data.estado = cuerpo.estado;
    }
    if ('categoriaId' in cuerpo) {
      const categoriaId = this.opcionalTexto(cuerpo.categoriaId);
      if (categoriaId && !(await this.prisma.categoria.findFirst({ where: { id: categoriaId, empresaId: sesion.empresaId, ...(categoriaId === actual.categoriaId ? {} : { activa: true }) } }))) {
        throw new BadRequestException('La categoría no pertenece a esta empresa.');
      }
      data.categoriaId = categoriaId;
    }
    if (Object.keys(data).length === 0 && !('precios' in cuerpo)) throw new BadRequestException('No se recibieron campos para actualizar.');
    const producto = await this.prisma.$transaction(async tx => {
      const categoria = await this.guardarCategoria(tx, sesion.empresaId, cuerpo.categoriaNombre);
      if (categoria !== undefined) data.categoriaId = categoria;
      const actualizado = await tx.producto.update({ where: { id }, data, select: { id: true, sku: true, nombre: true, estado: true, visibleEnTienda: true } });
      await this.guardarPrecios(tx, sesion.empresaId, id, cuerpo.precios);
      await this.guardarVariantes(tx, sesion.empresaId, id, actualizado.sku, cuerpo.datosAdicionales, cuerpo.preciosVariantes);
      await tx.historialProducto.create({ data: { empresaId: sesion.empresaId, productoId: id, usuarioId: sesion.usuarioId, accion: 'Producto actualizado' } });
      return actualizado;
    }, { isolationLevel: 'Serializable' });
    return { datos: producto };
  }

  private texto(valor: unknown, campo: string, maximo: number) {
    if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > maximo) {
      throw new BadRequestException(`${campo} es obligatorio y admite hasta ${maximo} caracteres.`);
    }
    return valor.trim();
  }

  private async comprobarMarca(empresaId: string, nombre: string) {
    const marca = await this.prisma.marca.findFirst({ where: { empresaId, nombre, activa: true } });
    if (!marca) throw new BadRequestException('Selecciona una marca activa registrada.');
  }

  private opcionalTexto(valor: unknown) {
    if (valor === undefined || valor === null || valor === '') return null;
    if (typeof valor !== 'string') throw new BadRequestException('El campo debe ser texto.');
    return valor.trim();
  }

  private campos(cuerpo: Record<string, unknown>) {
    const data: Record<string, unknown> = {};
    for (const campo of ['marca', 'codigoBarras']) if (campo in cuerpo) data[campo] = this.opcionalTexto(cuerpo[campo]);
    if (typeof data.marca === 'string' && data.marca.length > 100) throw new BadRequestException('La marca admite hasta 100 caracteres.');
    if (typeof data.codigoBarras === 'string' && data.codigoBarras.length > 80) throw new BadRequestException('El código de barras admite hasta 80 caracteres.');
    for (const campo of ['visibleEnTienda', 'destacado', 'permiteDelivery', 'permiteAgencia', 'permiteRecojo']) {
      if (campo in cuerpo) { if (typeof cuerpo[campo] !== 'boolean') throw new BadRequestException(`${campo} debe ser booleano.`); data[campo] = cuerpo[campo]; }
    }
    if ('stockMinimo' in cuerpo) {
      if (typeof cuerpo.stockMinimo !== 'number' || !Number.isFinite(cuerpo.stockMinimo) || cuerpo.stockMinimo < 0) throw new BadRequestException('El stock mínimo no es válido.');
      data.stockMinimo = cuerpo.stockMinimo;
    }
    if ('estado' in cuerpo) {
      if (typeof cuerpo.estado !== 'string' || !estados.includes(cuerpo.estado as (typeof estados)[number])) throw new BadRequestException('El estado del producto no es válido.');
      data.estado = cuerpo.estado;
    }
    if ('datosAdicionales' in cuerpo) {
      const d = cuerpo.datosAdicionales;
      if (!d || typeof d !== 'object' || Array.isArray(d)) throw new BadRequestException('Los detalles del producto no son válidos.');
      const detalles = d as Record<string, unknown>;
      combinacionesVariantes(detalles);
      for (const key of ['peso', 'medidas', 'garantia', 'tipoEnvio']) if (typeof detalles[key] !== 'string' || (detalles[key] as string).length > 120) throw new BadRequestException(`El campo ${key} no es válido.`);
      for (const key of ['etiquetas', 'colores', 'capacidades']) if (!Array.isArray(detalles[key]) || (detalles[key] as unknown[]).length > 20 || !(detalles[key] as unknown[]).every(x => typeof x === 'string' && x.trim().length > 0 && x.length <= 50)) throw new BadRequestException(`El campo ${key} no es válido.`);
      if (detalles.peso && (!Number.isFinite(Number(detalles.peso)) || Number(detalles.peso) < 0)) throw new BadRequestException('El peso no es válido.');
      data.datosAdicionales = detalles;
    }
    return data;
  }

  private async guardarCategoria(tx: Pick<PrismaService, 'categoria'>, empresaId: string, value: unknown) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const nombre = this.texto(value, 'categoría', 120);
    const categoria = await tx.categoria.findFirst({ where: { empresaId, nombre, activa: true } });
    if (!categoria) throw new BadRequestException('Selecciona una categoría activa registrada.');
    return categoria.id;
  }

  private async guardarVariantes(tx: Pick<PrismaService, 'varianteProducto'>, empresaId: string, productoId: string, sku: string, details: unknown, precios: unknown) {
    if (!details || typeof details !== 'object') return;
    const combinaciones = combinacionesVariantes(details as Record<string, unknown>);
    if (precios !== undefined && (!precios || typeof precios !== 'object' || Array.isArray(precios))) throw new BadRequestException('Los precios de variantes no son válidos.');
    const tablaPrecios = (precios || {}) as Record<string, unknown>;
    const claves = new Set(combinaciones.map(claveVariante));
    for (const [clave, valor] of Object.entries(tablaPrecios)) if (!claves.has(clave) || (valor !== null && (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0))) throw new BadRequestException('El precio de una variante no es válido.');
    const existentes = await tx.varianteProducto.findMany({ where: { empresaId, productoId }, include: { lotes: { select: { existencias: { select: { cantidadFisica: true } } } } } });
    const eliminadasConStock = existentes.some(v => v.activa && !claves.has(claveVariante(v.atributos as Record<string, string>)) && v.lotes.some(l => l.existencias.some(e => Number(e.cantidadFisica) > 0)));
    if (eliminadasConStock) throw new BadRequestException('No se puede quitar una variante que tiene stock. Primero ajusta sus existencias a cero.');
    const activos: string[] = [];
    for (const atributos of combinaciones) {
      const clave = claveVariante(atributos);
      const actual = existentes.find(v => claveVariante(v.atributos as Record<string, string>) === clave);
      const precioPublico = Object.hasOwn(tablaPrecios, clave) ? tablaPrecios[clave] as number | null : undefined;
      if (actual) { await tx.varianteProducto.update({ where: { id: actual.id }, data: { activa: true, ...(precioPublico !== undefined ? { precioPublico } : {}) } }); activos.push(actual.id); continue; }
      const suffix = createHash('sha256').update(`${productoId}:${clave}`).digest('hex').slice(0, 8).toUpperCase();
      const nueva = await tx.varianteProducto.create({ data: { empresaId, productoId, sku: `${sku.slice(0, 51)}-${suffix}`, atributos, precioPublico } });
      activos.push(nueva.id);
    }
    await tx.varianteProducto.updateMany({ where: { empresaId, productoId, id: { notIn: activos } }, data: { activa: false } });
  }

  private async guardarPrecios(tx: Pick<PrismaService, 'listaPrecios' | 'precioProducto'>, empresaId: string, productoId: string, precios: unknown) {
    if (precios === undefined) return;
    if (!precios || typeof precios !== 'object' || Array.isArray(precios)) throw new BadRequestException('Los precios no son válidos.');
    const niveles = [['pub', 'Público', 1], ['min', 'Minorista', 6], ['may', 'Mayorista', 24], ['emp', 'Empresa', 50]] as const;
    for (const [clave, nombre, cantidadMinima] of niveles) {
      const valor = (precios as Record<string, unknown>)[clave];
      if (valor === undefined) continue;
      if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) throw new BadRequestException(`El precio ${nombre} no es válido.`);
      const lista = await tx.listaPrecios.upsert({ where: { empresaId_nombre: { empresaId, nombre } }, create: { empresaId, nombre }, update: {} });
      const ahora = new Date();
      await tx.precioProducto.updateMany({ where: { listaPreciosId: lista.id, productoId, vigenteHasta: null }, data: { vigenteHasta: ahora } });
      await tx.precioProducto.create({ data: { listaPreciosId: lista.id, productoId, cantidadMinima, precioUnitario: valor, vigenteDesde: ahora } });
    }
  }
}
