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
    return { datos: await this.prisma.categoria.findMany({ where: { empresaId: sesion.empresaId }, orderBy: { nombre: 'asc' }, select: { id: true, nombre: true, descripcion: true, activa: true, categoriaPadreId: true, _count: { select: { productos: true } } } }) };
  }

  @Post()
  @RequierePermisos('catalogo.productos.crear')
  async crear(@SesionActual() sesion: ContextoAutenticado, @Body() body: Record<string, unknown>) {
    const nombre = this.nombre(body.nombre);
    const descripcion = this.descripcion(body.descripcion);
    const categoriaPadreId = await this.validarPadre(sesion.empresaId, body.categoriaPadreId);
    if (await this.prisma.categoria.findFirst({ where: { empresaId: sesion.empresaId, nombre: { equals: nombre, mode: 'insensitive' } } })) throw new ConflictException('Ya existe una categoría con ese nombre.');
    try {
      return { datos: await this.prisma.categoria.create({ data: { empresaId: sesion.empresaId, nombre, descripcion, categoriaPadreId }, select: { id: true, nombre: true, descripcion: true, activa: true, categoriaPadreId: true } }) };
    } catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una categoría con ese nombre.'); throw error; }
  }

  @Patch(':id')
  @RequierePermisos('catalogo.productos.editar')
  async editar(@SesionActual() sesion: ContextoAutenticado, @Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, unknown>) {
    const actual = await this.prisma.categoria.findFirst({ where: { id, empresaId: sesion.empresaId }, select: { id: true } });
    if (!actual) throw new NotFoundException('No se encontró la categoría.');
    const data: { nombre?: string; descripcion?: string | null; activa?: boolean; categoriaPadreId?: string | null } = {};
    if ('categoriaPadreId' in body) data.categoriaPadreId = await this.validarPadre(sesion.empresaId, body.categoriaPadreId, id);
    if ('nombre' in body) {
      data.nombre = this.nombre(body.nombre);
      if (await this.prisma.categoria.findFirst({ where: { empresaId: sesion.empresaId, id: { not: id }, nombre: { equals: data.nombre, mode: 'insensitive' } } })) throw new ConflictException('Ya existe una categoría con ese nombre.');
    }
    if ('descripcion' in body) data.descripcion = this.descripcion(body.descripcion);
    if ('activa' in body) { if (typeof body.activa !== 'boolean') throw new BadRequestException('El estado no es válido.'); if (!body.activa && await this.prisma.categoria.count({ where: { empresaId: sesion.empresaId, categoriaPadreId: id, activa: true } })) throw new BadRequestException('Desactiva primero las subcategorías activas.'); if (body.activa) { const cat = await this.prisma.categoria.findFirst({ where: { id, empresaId: sesion.empresaId }, select: { categoriaPadreId: true } }); await this.validarPadre(sesion.empresaId, data.categoriaPadreId !== undefined ? data.categoriaPadreId : cat?.categoriaPadreId, id); } data.activa = body.activa; }
    if (!Object.keys(data).length) throw new BadRequestException('No se recibieron cambios.');
    try { return { datos: await this.prisma.categoria.update({ where: { id }, data, select: { id: true, nombre: true, descripcion: true, activa: true, categoriaPadreId: true } }) }; }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una categoría con ese nombre.'); throw error; }
  }

  private async validarPadre(empresaId: string, value: unknown, actualId?: string): Promise<string | null> {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new BadRequestException('La categoría superior no es válida.');
    const visitados = new Set<string>();
    let id: string | null = value;
    while (id) {
      if (id === actualId || visitados.has(id)) throw new BadRequestException('La jerarquía de categorías no puede formar un ciclo.');
      visitados.add(id);
      const padre = await this.prisma.categoria.findFirst({ where: { id, empresaId }, select: { activa: true, categoriaPadreId: true } });
      if (!padre || !padre.activa) throw new BadRequestException('La categoría superior debe existir y estar activa.');
      id = padre.categoriaPadreId;
    }
    return value;
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
