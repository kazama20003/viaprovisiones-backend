import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../compartido/infraestructura/prisma/prisma.service';
import { PermisoGuard, RequierePermisos, SesionActual, SesionGuard } from '../acceso/sesion.guard';
import type { ContextoAutenticado } from '../acceso/sesion.guard';

@Controller('inventario')
@UseGuards(SesionGuard, PermisoGuard)
export class UbicacionesController {
  constructor(private readonly prisma: PrismaService) {}
  private texto(v: unknown, campo: string, max: number) { if (typeof v !== 'string' || !v.trim() || v.trim().length > max) throw new BadRequestException(`${campo} es obligatorio y admite hasta ${max} caracteres.`); return v.trim(); }
  private direccion(v: unknown) { if (v == null || v === '') return null; return this.texto(v, 'La dirección', 250); }
  private codigo(v: unknown) { const c = this.texto(v, 'El código', 30).toUpperCase(); if (!/^[A-Z0-9_-]+$/.test(c)) throw new BadRequestException('El código admite letras, números, guiones y guiones bajos.'); return c; }

  @Get('sucursales') @RequierePermisos('catalogo.productos.leer')
  async sucursales(@SesionActual() s: ContextoAutenticado) { return { datos: await this.prisma.sucursal.findMany({ where: { empresaId: s.empresaId }, orderBy: { nombre: 'asc' }, include: { _count: { select: { almacenes: true } } } }) }; }

  @Post('sucursales') @RequierePermisos('catalogo.productos.editar')
  async crearSucursal(@SesionActual() s: ContextoAutenticado, @Body() b: Record<string, unknown>) {
    try { return { datos: await this.prisma.sucursal.create({ data: { empresaId:s.empresaId, codigo:this.codigo(b.codigo), nombre:this.texto(b.nombre,'El nombre',120), direccion:this.direccion(b.direccion) } }) }; }
    catch(e) { if ((e as { code?:string }).code === 'P2002') throw new ConflictException('Ya existe una sucursal con ese código.'); throw e; }
  }
  @Patch('sucursales/:id') @RequierePermisos('catalogo.productos.editar')
  async editarSucursal(@SesionActual() s: ContextoAutenticado, @Param('id', ParseUUIDPipe) id:string, @Body() b:Record<string,unknown>) {
    if (!(await this.prisma.sucursal.findFirst({ where:{ id, empresaId:s.empresaId } }))) throw new NotFoundException('No se encontró la sucursal.');
    const data: { nombre?:string; direccion?:string|null; activa?:boolean } = {};
    if ('nombre' in b) data.nombre = this.texto(b.nombre,'El nombre',120);
    if ('direccion' in b) data.direccion = this.direccion(b.direccion);
    if ('activa' in b) { if (typeof b.activa !== 'boolean') throw new BadRequestException('Estado inválido.'); if (!b.activa && await this.prisma.almacen.count({ where:{ empresaId:s.empresaId, sucursalId:id, activo:true } })) throw new BadRequestException('Desactiva primero las ubicaciones de esta sucursal.'); data.activa=b.activa; }
    if (!Object.keys(data).length) throw new BadRequestException('No se recibieron cambios.');
    return { datos: await this.prisma.sucursal.update({ where:{ id }, data }) };
  }
  @Get('almacenes') @RequierePermisos('catalogo.productos.leer')
  async almacenes(@SesionActual() s: ContextoAutenticado) { return { datos: await this.prisma.almacen.findMany({ where:{ empresaId:s.empresaId }, include:{ sucursal:{ select:{ id:true,nombre:true } } }, orderBy:{ nombre:'asc' } }) }; }
  @Get('movimientos') @RequierePermisos('catalogo.productos.leer')
  async movimientos(@SesionActual() s:ContextoAutenticado) { const datos=await this.prisma.movimientoInventario.findMany({where:{empresaId:s.empresaId},orderBy:{creadoEn:'desc'},take:200,include:{producto:{select:{nombre:true,sku:true}},lote:{select:{codigo:true,variante:{select:{atributos:true,sku:true}}}},almacen:{select:{nombre:true}},traslado:{select:{numero:true}}}}); return {datos:datos.map(m=>({...m,cantidad:Number(m.cantidad),costoUnitario:m.costoUnitario===null?null:Number(m.costoUnitario)}))}; }
  @Post('almacenes') @RequierePermisos('catalogo.productos.editar')
  async crearAlmacen(@SesionActual() s:ContextoAutenticado, @Body() b:Record<string,unknown>) {
    const tipo=this.tipo(b.tipo); const sucursalId=await this.sucursalId(s.empresaId,b.sucursalId);
    try { return { datos: await this.prisma.almacen.create({ data:{ empresaId:s.empresaId,codigo:this.codigo(b.codigo),nombre:this.texto(b.nombre,'El nombre',120),direccion:this.direccion(b.direccion),tipo,sucursalId } }) }; }
    catch(e) { if ((e as { code?:string }).code === 'P2002') throw new ConflictException('Ya existe una ubicación con ese código.'); throw e; }
  }
  @Patch('almacenes/:id') @RequierePermisos('catalogo.productos.editar')
  async editarAlmacen(@SesionActual() s:ContextoAutenticado, @Param('id',ParseUUIDPipe) id:string, @Body() b:Record<string,unknown>) {
    if (!(await this.prisma.almacen.findFirst({where:{id,empresaId:s.empresaId}}))) throw new NotFoundException('No se encontró la ubicación.');
    const data:{nombre?:string;direccion?:string|null;tipo?:string;sucursalId?:string|null;activo?:boolean}={};
    if ('nombre' in b) data.nombre=this.texto(b.nombre,'El nombre',120);
    if ('direccion' in b) data.direccion=this.direccion(b.direccion);
    if ('tipo' in b) data.tipo=this.tipo(b.tipo);
    if ('sucursalId' in b) data.sucursalId=await this.sucursalId(s.empresaId,b.sucursalId);
    if ('activo' in b) { if (typeof b.activo!=='boolean') throw new BadRequestException('Estado inválido.'); if (!b.activo) { const [stock,traslados]=await Promise.all([this.prisma.existenciaLote.count({where:{empresaId:s.empresaId,almacenId:id,cantidadFisica:{gt:0}}}),this.prisma.traslado.count({where:{empresaId:s.empresaId,estado:{in:['preparando','en_camino']},OR:[{almacenOrigenId:id},{almacenDestinoId:id}]}})]); if(stock || traslados) throw new BadRequestException('La ubicación tiene stock o traslados pendientes.'); } data.activo=b.activo; }
    if (!Object.keys(data).length) throw new BadRequestException('No se recibieron cambios.');
    return {datos:await this.prisma.almacen.update({where:{id},data})};
  }
  private tipo(v:unknown) { if (v !== 'almacen' && v !== 'tienda') throw new BadRequestException('Selecciona almacén o tienda.'); return v; }
  private async sucursalId(empresaId:string,v:unknown):Promise<string|null> { if(v==null || v==='') return null; if(typeof v!=='string' || !/^[0-9a-f-]{36}$/i.test(v)) throw new BadRequestException('Sucursal inválida.'); if(!(await this.prisma.sucursal.findFirst({where:{id:v,empresaId,activa:true}}))) throw new BadRequestException('La sucursal no existe o está inactiva.'); return v; }
}
