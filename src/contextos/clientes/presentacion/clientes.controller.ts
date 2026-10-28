import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../../compartido/infraestructura/prisma/prisma.service';
import { PermisoGuard, RequierePermisos, SesionActual, SesionGuard } from '../../acceso/sesion.guard';
import type { ContextoAutenticado } from '../../acceso/sesion.guard';

const tiposCliente = ['consumidor', 'minorista', 'mayorista', 'empresa'] as const;

@Controller('clientes')
@UseGuards(SesionGuard, PermisoGuard)
export class ClientesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequierePermisos('clientes.leer')
  async listar(@SesionActual() sesion: ContextoAutenticado, @Query('buscar') buscar?: string) {
    const clientes = await this.prisma.cliente.findMany({
      where: {
        empresaId: sesion.empresaId,
        ...(buscar ? { OR: [
          { nombre: { contains: buscar.trim(), mode: 'insensitive' } },
          { numeroDocumento: { contains: buscar.trim() } },
          { correo: { contains: buscar.trim(), mode: 'insensitive' } },
        ] } : {}),
      },
      orderBy: { creadoEn: 'desc' },
      take: 100,
      select: { id: true, tipoDocumento: true, numeroDocumento: true, tipoCliente: true, nombre: true, razonSocial: true, correo: true, telefono: true, limiteCredito: true, condicionPagoDias: true, activo: true, creadoEn: true },
    });
    return { datos: clientes.map((cliente) => ({ ...cliente, limiteCredito: Number(cliente.limiteCredito) })) };
  }

  @Post()
  @RequierePermisos('clientes.crear')
  async crear(@SesionActual() sesion: ContextoAutenticado, @Body() cuerpo: Record<string, unknown>) {
    if (typeof cuerpo.nombre !== 'string' || !cuerpo.nombre.trim() || cuerpo.nombre.trim().length > 180) {
      throw new BadRequestException('nombre es obligatorio y admite hasta 180 caracteres.');
    }
    const tipoCliente = cuerpo.tipoCliente ?? 'consumidor';
    if (typeof tipoCliente !== 'string' || !tiposCliente.includes(tipoCliente as (typeof tiposCliente)[number])) {
      throw new BadRequestException('El tipo de cliente no es válido.');
    }
    const dias = cuerpo.condicionPagoDias ?? 0;
    const limite = Number(cuerpo.limiteCredito ?? 0);
    if (!Number.isInteger(dias) || Number(dias) < 0 || !Number.isFinite(limite) || limite < 0) {
      throw new BadRequestException('El crédito y los días de pago deben ser valores no negativos.');
    }
    const cliente = await this.prisma.cliente.create({
      data: {
        empresaId: sesion.empresaId,
        nombre: cuerpo.nombre.trim(),
        tipoCliente: tipoCliente as (typeof tiposCliente)[number],
        correo: typeof cuerpo.correo === 'string' ? cuerpo.correo.trim().toLowerCase() : null,
        telefono: typeof cuerpo.telefono === 'string' ? cuerpo.telefono.trim() : null,
        tipoDocumento: typeof cuerpo.tipoDocumento === 'string' ? cuerpo.tipoDocumento as never : undefined,
        numeroDocumento: typeof cuerpo.numeroDocumento === 'string' ? cuerpo.numeroDocumento.trim() : null,
        limiteCredito: limite,
        condicionPagoDias: Number(dias),
      },
      select: { id: true, nombre: true, tipoCliente: true, correo: true, telefono: true, creadoEn: true },
    });
    return { datos: cliente };
  }
}
