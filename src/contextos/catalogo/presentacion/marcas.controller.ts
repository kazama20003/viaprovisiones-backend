import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../../compartido/infraestructura/prisma/prisma.service';
import { PermisoGuard, RequierePermisos, SesionActual, SesionGuard } from '../../acceso/sesion.guard';
import type { ContextoAutenticado } from '../../acceso/sesion.guard';

@Controller('marcas')
@UseGuards(SesionGuard, PermisoGuard)
export class MarcasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequierePermisos('catalogo.productos.leer')
  async listar(@SesionActual() sesion: ContextoAutenticado) {
    return { datos: await this.prisma.marca.findMany({ where: { empresaId: sesion.empresaId }, orderBy: { nombre: 'asc' } }) };
  }

  @Post()
  @RequierePermisos('catalogo.productos.crear')
  async crear(@SesionActual() sesion: ContextoAutenticado, @Body() body: Record<string, unknown>) {
    const nombre = this.nombre(body.nombre);
    if (await this.prisma.marca.findFirst({ where: { empresaId: sesion.empresaId, nombre: { equals: nombre, mode: 'insensitive' } } })) throw new ConflictException('Ya existe una marca con ese nombre.');
    try { return { datos: await this.prisma.marca.create({ data: { empresaId: sesion.empresaId, nombre } }) }; }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una marca con ese nombre.'); throw error; }
  }

  @Patch(':id')
  @RequierePermisos('catalogo.productos.editar')
  async editar(@SesionActual() sesion: ContextoAutenticado, @Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, unknown>) {
    const actual = await this.prisma.marca.findFirst({ where: { id, empresaId: sesion.empresaId } });
    if (!actual) throw new NotFoundException('No se encontró la marca.');
    const data: { nombre?: string; activa?: boolean } = {};
    if ('nombre' in body) {
      data.nombre = this.nombre(body.nombre);
      if (await this.prisma.marca.findFirst({ where: { empresaId: sesion.empresaId, id: { not: id }, nombre: { equals: data.nombre, mode: 'insensitive' } } })) throw new ConflictException('Ya existe una marca con ese nombre.');
    }
    if ('activa' in body) { if (typeof body.activa !== 'boolean') throw new BadRequestException('El estado no es válido.'); data.activa = body.activa; }
    if (!Object.keys(data).length) throw new BadRequestException('No se recibieron cambios.');
    try {
      return { datos: await this.prisma.$transaction(async tx => {
        const marca = await tx.marca.update({ where: { id }, data });
        if (data.nombre && data.nombre !== actual.nombre) await tx.producto.updateMany({ where: { empresaId: sesion.empresaId, marca: { equals: actual.nombre, mode: 'insensitive' } }, data: { marca: data.nombre } });
        return marca;
      }) };
    } catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una marca con ese nombre.'); throw error; }
  }

  private nombre(value: unknown) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 100) throw new BadRequestException('El nombre es obligatorio y admite hasta 100 caracteres.');
    return value.trim();
  }
}
