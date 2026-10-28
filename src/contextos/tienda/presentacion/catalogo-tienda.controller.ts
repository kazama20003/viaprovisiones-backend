import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../../compartido/infraestructura/prisma/prisma.service';

@Controller('tienda/productos')
export class CatalogoTiendaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listar(@Query('buscar') buscar?: string, @Query('categoria') categoria?: string) {
    const empresaId = this.obtenerEmpresaId();
    const productos = await this.prisma.producto.findMany({
      where: {
        empresaId,
        estado: 'publicado',
        visibleEnTienda: true,
        ...(buscar
          ? { nombre: { contains: buscar.trim(), mode: 'insensitive' } }
          : {}),
        ...(categoria ? { categoria: { nombre: categoria } } : {}),
      },
      orderBy: [{ destacado: 'desc' }, { nombre: 'asc' }],
      take: 100,
      include: {
        categoria: { select: { nombre: true } },
        imagenes: {
          where: { esPrincipal: true },
          take: 1,
          select: { url: true, textoAlternativo: true },
        },
        precios: {
          where: {
            vigenteDesde: { lte: new Date() },
            OR: [{ vigenteHasta: null }, { vigenteHasta: { gt: new Date() } }],
          },
          orderBy: [{ cantidadMinima: 'asc' }, { vigenteDesde: 'desc' }],
          take: 1,
          select: { precioUnitario: true },
        },
        lotes: {
          where: { estado: 'disponible' },
          select: {
            existencias: {
              where: { empresaId },
              select: { cantidadFisica: true, cantidadReservada: true },
            },
          },
        },
      },
    });

    return {
      datos: productos.map((producto) => ({
        id: producto.id,
        sku: producto.sku,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        categoria: producto.categoria?.nombre ?? null,
        precio: Number(producto.precios[0]?.precioUnitario ?? 0),
        imagen: producto.imagenes[0]?.url ?? null,
        textoAlternativo: producto.imagenes[0]?.textoAlternativo ?? producto.nombre,
        destacado: producto.destacado,
        stockDisponible: producto.lotes.reduce(
          (total, lote) =>
            total +
            lote.existencias.reduce(
              (cantidad, existencia) =>
                cantidad +
                Number(existencia.cantidadFisica) -
                Number(existencia.cantidadReservada),
              0,
            ),
          0,
        ),
      })),
    };
  }

  @Get(':id')
  async obtener(@Param('id') id: string) {
    const empresaId = this.obtenerEmpresaId();
    const producto = await this.prisma.producto.findFirst({
      where: { id, empresaId, estado: 'publicado', visibleEnTienda: true },
      include: {
        categoria: { select: { nombre: true } },
        imagenes: { orderBy: { posicion: 'asc' } },
        precios: {
          where: {
            vigenteDesde: { lte: new Date() },
            OR: [{ vigenteHasta: null }, { vigenteHasta: { gt: new Date() } }],
          },
          orderBy: [{ cantidadMinima: 'asc' }, { vigenteDesde: 'desc' }],
        },
        variantes: { where: { activa: true }, orderBy: { sku: 'asc' } },
      },
    });

    if (!producto) throw new NotFoundException('No se encontró el producto.');

    return {
      datos: {
        ...producto,
        precios: producto.precios.map((precio) => ({
          ...precio,
          precioUnitario: Number(precio.precioUnitario),
        })),
      },
    };
  }

  private obtenerEmpresaId(): string {
    const empresaId = process.env.EMPRESA_ID;
    if (!empresaId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(empresaId)) {
      throw new ServiceUnavailableException(
        'Configura EMPRESA_ID con el UUID de la empresa cuyo catálogo publicarás.',
      );
    }
    return empresaId;
  }
}
