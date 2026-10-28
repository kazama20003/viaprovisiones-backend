import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../../compartido/infraestructura/prisma/prisma.service';
import { PermisoGuard, RequierePermisos, SesionActual, SesionGuard } from '../../acceso/sesion.guard';
import type { ContextoAutenticado } from '../../acceso/sesion.guard';

@Controller('panel/resumen')
@UseGuards(SesionGuard, PermisoGuard)
export class ResumenPanelController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequierePermisos('panel.resumen.leer')
  async obtener(@SesionActual() sesion: ContextoAutenticado) {
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);
    const [productos, clientes, pedidos, pedidosHoy, ventasHoy] = await Promise.all([
      this.prisma.producto.count({ where: { empresaId: sesion.empresaId } }),
      this.prisma.cliente.count({ where: { empresaId: sesion.empresaId, activo: true } }),
      this.prisma.pedido.count({ where: { empresaId: sesion.empresaId, estado: { not: 'cancelado' } } }),
      this.prisma.pedido.count({ where: { empresaId: sesion.empresaId, creadoEn: { gte: inicioDia }, estado: { not: 'cancelado' } } }),
      this.prisma.pedido.aggregate({
        where: { empresaId: sesion.empresaId, creadoEn: { gte: inicioDia }, estadoPago: { in: ['pagado', 'parcial'] }, estado: { not: 'cancelado' } },
        _sum: { total: true },
      }),
    ]);
    return { datos: { productos, clientes, pedidos, pedidosHoy, ventasHoy: Number(ventasHoy._sum.total ?? 0) } };
  }
}
