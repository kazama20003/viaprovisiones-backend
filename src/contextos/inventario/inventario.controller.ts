import { BadRequestException, Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../compartido/infraestructura/prisma/prisma.service';
import { PermisoGuard, RequierePermisos, SesionActual, SesionGuard } from '../acceso/sesion.guard';
import type { ContextoAutenticado } from '../acceso/sesion.guard';

@Controller('inventario/lotes')
@UseGuards(SesionGuard, PermisoGuard)
export class InventarioController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(':id/aprobar')
  @RequierePermisos('catalogo.productos.editar')
  async aprobar(@SesionActual() sesion: ContextoAutenticado, @Param('id') id: string) {
    const result = await this.prisma.lote.updateMany({ where: { id, empresaId: sesion.empresaId, estado: 'en_revision' }, data: { estado: 'disponible' } });
    if (!result.count) throw new BadRequestException('No se encontró un lote pendiente de revisión.');
    return { datos: { id, estado: 'disponible' } };
  }

  @Post(':id/ajustar')
  @RequierePermisos('catalogo.productos.editar')
  async ajustar(@SesionActual() sesion: ContextoAutenticado, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const { almacenId, cantidad, motivo } = body;
    if (typeof almacenId !== 'string' || typeof cantidad !== 'number' || !Number.isFinite(cantidad) || cantidad === 0 || Math.abs(cantidad) > 999999 || typeof motivo !== 'string' || !motivo.trim() || motivo.length > 250) throw new BadRequestException('Indica almacén, cantidad y motivo válidos.');
    return this.prisma.$transaction(async tx => {
      const lote = await tx.lote.findFirst({ where: { id, empresaId: sesion.empresaId } });
      const stock = await tx.existenciaLote.findFirst({ where: { loteId: id, almacenId, empresaId: sesion.empresaId } });
      if (!lote || !stock) throw new BadRequestException('No se encontró la existencia del lote.');
      const count = await tx.$executeRaw`UPDATE existencias_lotes SET cantidad_fisica = cantidad_fisica + ${cantidad}, actualizado_en = NOW() WHERE id = ${stock.id}::uuid AND empresa_id = ${sesion.empresaId}::uuid AND cantidad_fisica + ${cantidad} >= cantidad_reservada`;
      if (!count) throw new BadRequestException('El ajuste supera el stock disponible o reservado.');
      await tx.movimientoInventario.create({ data: { empresaId: sesion.empresaId, productoId: lote.productoId, loteId: lote.id, almacenId, tipo: 'ajuste', sentido: cantidad > 0 ? 'entrada' : 'salida', cantidad: Math.abs(cantidad), costoUnitario: lote.costoUnitario, usuarioId: sesion.usuarioId, motivo: motivo.trim() } });
      return { datos: { id } };
    });
  }

  @Post(':id/trasladar')
  @RequierePermisos('catalogo.productos.editar')
  async trasladar(@SesionActual() sesion: ContextoAutenticado, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const { origenId, destino, cantidad } = body;
    if (typeof origenId !== 'string' || !['TIENDA', 'ALMACEN'].includes(String(destino)) || typeof cantidad !== 'number' || !Number.isFinite(cantidad) || cantidad <= 0 || cantidad > 999999) throw new BadRequestException('Indica origen, destino y cantidad válidos.');
    return this.prisma.$transaction(async tx => {
      const lote = await tx.lote.findFirst({ where: { id, empresaId: sesion.empresaId } });
      const origen = await tx.existenciaLote.findFirst({ where: { loteId: id, almacenId: origenId, empresaId: sesion.empresaId } });
      if (!lote || !origen) throw new BadRequestException('No se encontró la existencia del lote.');
      const almacen = await tx.almacen.upsert({ where: { empresaId_codigo: { empresaId: sesion.empresaId, codigo: String(destino) } }, create: { empresaId: sesion.empresaId, codigo: String(destino), nombre: destino === 'TIENDA' ? 'Tienda Dean Valdivia' : 'Almacén' }, update: {} });
      if (almacen.id === origenId) throw new BadRequestException('El origen y el destino deben ser diferentes.');
      const count = await tx.$executeRaw`UPDATE existencias_lotes SET cantidad_fisica = cantidad_fisica - ${cantidad}, actualizado_en = NOW() WHERE id = ${origen.id}::uuid AND empresa_id = ${sesion.empresaId}::uuid AND cantidad_fisica - cantidad_reservada >= ${cantidad}`;
      if (!count) throw new BadRequestException('No hay suficiente stock disponible para trasladar.');
      await tx.existenciaLote.upsert({ where: { loteId_almacenId: { loteId: lote.id, almacenId: almacen.id } }, create: { empresaId: sesion.empresaId, loteId: lote.id, almacenId: almacen.id, cantidadFisica: cantidad }, update: { cantidadFisica: { increment: cantidad } } });
      const base = { empresaId: sesion.empresaId, productoId: lote.productoId, loteId: lote.id, cantidad, costoUnitario: lote.costoUnitario, usuarioId: sesion.usuarioId };
      await tx.movimientoInventario.create({ data: { ...base, almacenId: origenId, tipo: 'traslado_salida', sentido: 'salida' } });
      await tx.movimientoInventario.create({ data: { ...base, almacenId: almacen.id, tipo: 'traslado_entrada', sentido: 'entrada' } });
      return { datos: { id } };
    });
  }

  @Post()
  @RequierePermisos('catalogo.productos.editar')
  async registrar(@SesionActual() sesion: ContextoAutenticado, @Body() body: Record<string, unknown>) {
    const { productoId, varianteId, proveedor, cantidad, costoUnitario, fechaIngreso, garantiaHasta, ubicacion, revisar } = body;
    if (typeof productoId !== 'string' || !(await this.prisma.producto.findFirst({ where: { id: productoId, empresaId: sesion.empresaId } }))) throw new BadRequestException('Selecciona un producto válido.');
    if (varianteId !== undefined && varianteId !== null && (typeof varianteId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(varianteId))) throw new BadRequestException('Selecciona una variante válida.');
    if (typeof cantidad !== 'number' || !Number.isFinite(cantidad) || cantidad <= 0 || cantidad > 999999) throw new BadRequestException('La cantidad debe ser mayor que cero.');
    if (typeof costoUnitario !== 'number' || !Number.isFinite(costoUnitario) || costoUnitario < 0) throw new BadRequestException('El costo unitario no es válido.');
    if (ubicacion !== 'Tienda Dean Valdivia' && ubicacion !== 'Almacén') throw new BadRequestException('Selecciona Tienda o Almacén para un lote recibido.');
    if (typeof revisar !== 'boolean') throw new BadRequestException('Indica si el lote requiere revisión.');
    if (proveedor !== undefined && (typeof proveedor !== 'string' || proveedor.length > 180)) throw new BadRequestException('El proveedor no es válido.');
    const fecha = (value: unknown, required: boolean) => {
      if (!value && !required) return null;
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('La fecha no es válida.');
      const parsed = new Date(`${value}T00:00:00.000Z`);
      if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value) throw new BadRequestException('La fecha no es válida.');
      return parsed;
    };
    const ingreso = fecha(fechaIngreso, true)!;
    const garantia = fecha(garantiaHasta, false);
    const codigo = `L-${randomUUID().slice(0, 8).toUpperCase()}`;
    const lote = await this.prisma.$transaction(async tx => {
      const variantes = await tx.varianteProducto.count({ where: { empresaId: sesion.empresaId, productoId, activa: true } });
      if (variantes && !varianteId) throw new BadRequestException('Selecciona la variante para ingresar este lote.');
      if (varianteId && !(await tx.varianteProducto.findFirst({ where: { id: varianteId as string, empresaId: sesion.empresaId, productoId, activa: true } }))) throw new BadRequestException('La variante no pertenece a este producto o está inactiva.');
      const almacen = await tx.almacen.upsert({ where: { empresaId_codigo: { empresaId: sesion.empresaId, codigo: ubicacion === 'Almacén' ? 'ALMACEN' : 'TIENDA' } }, create: { empresaId: sesion.empresaId, codigo: ubicacion === 'Almacén' ? 'ALMACEN' : 'TIENDA', nombre: ubicacion }, update: {} });
      let proveedorId: string | undefined;
      if (typeof proveedor === 'string' && proveedor.trim()) {
        const nombre = proveedor.trim();
        const encontrado = await tx.proveedor.findFirst({ where: { empresaId: sesion.empresaId, nombre } });
        proveedorId = (encontrado ?? await tx.proveedor.create({ data: { empresaId: sesion.empresaId, nombre } })).id;
      }
      const creado = await tx.lote.create({ data: { empresaId: sesion.empresaId, productoId, varianteId: (varianteId as string) || null, proveedorId, codigo, costoUnitario, fechaIngreso: ingreso, garantiaHasta: garantia, estado: revisar ? 'en_revision' : 'disponible' } });
      await tx.existenciaLote.create({ data: { empresaId: sesion.empresaId, loteId: creado.id, almacenId: almacen.id, cantidadFisica: cantidad } });
      await tx.movimientoInventario.create({ data: { empresaId: sesion.empresaId, productoId, loteId: creado.id, almacenId: almacen.id, tipo: 'recepcion', sentido: 'entrada', cantidad, costoUnitario, usuarioId: sesion.usuarioId } });
      return creado;
    }, { isolationLevel: 'Serializable' });
    return { datos: { id: lote.id, codigo: lote.codigo, estado: lote.estado } };
  }
}
