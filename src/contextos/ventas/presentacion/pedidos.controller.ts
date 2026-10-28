import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../../compartido/infraestructura/prisma/prisma.service';
import { PermisoGuard, RequierePermisos, SesionActual, SesionGuard } from '../../acceso/sesion.guard';
import type { ContextoAutenticado } from '../../acceso/sesion.guard';

@Controller('pedidos')
@UseGuards(SesionGuard, PermisoGuard)
export class PedidosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequierePermisos('ventas.pedidos.leer')
  async listar(@SesionActual() sesion: ContextoAutenticado, @Query('estado') estado?: string) {
    const pedidos = await this.prisma.pedido.findMany({
      where: {
        empresaId: sesion.empresaId,
        estado: estado ? estado as never : { not: 'cancelado' },
      },
      orderBy: { creadoEn: 'desc' },
      take: 100,
      include: {
        cliente: { select: { nombre: true, tipoCliente: true } },
        lineas: { select: { id: true, sku: true, descripcion: true, cantidad: true, precioUnitario: true, totalLinea: true } },
      },
    });
    return { datos: pedidos.map((pedido) => ({
      ...pedido,
      subtotal: Number(pedido.subtotal),
      descuento: Number(pedido.descuento),
      impuesto: Number(pedido.impuesto),
      costoEnvio: Number(pedido.costoEnvio),
      total: Number(pedido.total),
      lineas: pedido.lineas.map((linea) => ({ ...linea, cantidad: Number(linea.cantidad), precioUnitario: Number(linea.precioUnitario), totalLinea: Number(linea.totalLinea) })),
    })) };
  }

  @Post(':id/transiciones')
  @RequierePermisos('ventas.pedidos.transicionar')
  async transicionar(
    @Param('id') id: string,
    @SesionActual() sesion: ContextoAutenticado,
    @Body() cuerpo: { estado?: unknown },
  ) {
    const destino = cuerpo.estado;
    if (typeof destino !== 'string' || !['preparando', 'enviado', 'entregado'].includes(destino)) {
      throw new BadRequestException('La transición solicitada no está permitida.');
    }

    const actualizado = await this.prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findFirst({ where: { id, empresaId: sesion.empresaId } });
      if (!pedido) throw new NotFoundException('No se encontró el pedido.');
      const transiciones: Record<string, string[]> = {
        pagado: ['preparando'],
        preparando: ['enviado'],
        enviado: ['entregado'],
      };
      if (!transiciones[pedido.estado]?.includes(destino)) {
        throw new BadRequestException(`No se puede pasar de ${pedido.estado} a ${destino}.`);
      }
      const nuevo = await tx.pedido.update({ where: { id: pedido.id }, data: { estado: destino as never } });
      await tx.historialEstadoDocumento.create({
        data: {
          empresaId: sesion.empresaId,
          tipoDocumento: 'pedido',
          documentoId: pedido.id,
          estadoAnterior: pedido.estado,
          estadoNuevo: destino,
          cambiadoPorId: sesion.usuarioId,
        },
      });
      return nuevo;
    });
    return { datos: actualizado };
  }
}
