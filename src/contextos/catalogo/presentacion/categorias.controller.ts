import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../../compartido/infraestructura/prisma/prisma.service';
import { PermisoGuard, RequierePermisos, SesionActual, SesionGuard } from '../../acceso/sesion.guard';
import type { ContextoAutenticado } from '../../acceso/sesion.guard';

@Controller('categorias')
@UseGuards(SesionGuard, PermisoGuard)
export class CategoriasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequierePermisos('catalogo.productos.leer')
  async listar(@SesionActual() sesion: ContextoAutenticado) {
    return { datos: await this.prisma.categoria.findMany({ where: { empresaId: sesion.empresaId }, orderBy: { nombre: 'asc' }, select: { id: true, nombre: true, descripcion: true, activa: true, _count: { select: { productos: true } } } }) };
  }

  @Post()
  @RequierePermisos('catalogo.productos.crear')
  async crear(@SesionActual() sesion: ContextoAutenticado, @Body() body: Record<string, unknown>) {
    const nombre = this.nombre(body.nombre);
    const descripcion = this.descripcion(body.descripcion);
    if (await this.prisma.categoria.findFirst({ where: { empresaId: sesion.empresaId, nombre: { equals: nombre, mode: 'insensitive' } } })) throw new ConflictException('Ya existe una categoría con ese nombre.');
    try {
      return { datos: await this.prisma.categoria.create({ data: { empresaId: sesion.empresaId, nombre, descripcion }, select: { id: true, nombre: true, descripcion: true, activa: true } }) };
    } catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una categoría con ese nombre.'); throw error; }
  }

  @Patch(':id')
  @RequierePermisos('catalogo.productos.editar')
  async editar(@SesionActual() sesion: ContextoAutenticado, @Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, unknown>) {
    const actual = await this.prisma.categoria.findFirst({ where: { id, empresaId: sesion.empresaId }, select: { id: true } });
    if (!actual) throw new NotFoundException('No se encontró la categoría.');
    const data: { nombre?: string; descripcion?: string | null; activa?: boolean } = {};
    if ('nombre' in body) {
      data.nombre = this.nombre(body.nombre);
      if (await this.prisma.categoria.findFirst({ where: { empresaId: sesion.empresaId, id: { not: id }, nombre: { equals: data.nombre, mode: 'insensitive' } } })) throw new ConflictException('Ya existe una categoría con ese nombre.');
    }
    if ('descripcion' in body) data.descripcion = this.descripcion(body.descripcion);
    if ('activa' in body) { if (typeof body.activa !== 'boolean') throw new BadRequestException('El estado no es válido.'); data.activa = body.activa; }
    if (!Object.keys(data).length) throw new BadRequestException('No se recibieron cambios.');
    try { return { datos: await this.prisma.categoria.update({ where: { id }, data, select: { id: true, nombre: true, descripcion: true, activa: true } }) }; }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una categoría con ese nombre.'); throw error; }
  }

  private nombre(value: unknown) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) throw new BadRequestException('El nombre es obligatorio y admite hasta 120 caracteres.');
    return value.trim();
  }
  private descripcion(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || value.trim().length > 300) throw new BadRequestException('La descripción admite hasta 300 caracteres.');
    return value.trim() || null;
  }
}
