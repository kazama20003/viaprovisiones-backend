import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../compartido/infraestructura/prisma/prisma.service';
import { PermisoGuard, RequierePermisos, SesionActual, SesionGuard } from '../acceso/sesion.guard';
import type { ContextoAutenticado } from '../acceso/sesion.guard';
import type { Prisma } from '../../generated/prisma/client';

@Controller('inventario')
@UseGuards(SesionGuard, PermisoGuard)
export class UbicacionesController {
  constructor(private readonly prisma: PrismaService) {}
  private texto(v: unknown, campo: string, max: number) { if (typeof v !== 'string' || !v.trim() || v.trim().length > max) throw new BadRequestException(`${campo} es obligatorio y admite hasta ${max} caracteres.`); return v.trim(); }
  private direccion(v: unknown) { if (v == null || v === '') return null; return this.texto(v, 'La dirección', 250); }
  private codigo(v: unknown) { const c = this.texto(v, 'El código', 30).toUpperCase(); if (!/^[A-Z0-9_-]+$/.test(c)) throw new BadRequestException('El código admite letras, números, guiones y guiones bajos.'); return c; }
  private tipoSucursal(v:unknown) { if (typeof v !== 'string' || !['sin_definir','tienda','almacen','oficina','centro_distribucion','punto_recojo','mixta','otro'].includes(v)) throw new BadRequestException('Selecciona un tipo de sucursal válido.'); return v; }
  private coordenadas(b:Record<string,unknown>):{latitud:number|null;longitud:number|null}|undefined {
    if (!('latitud' in b) && !('longitud' in b)) return undefined;
    if (b.latitud === null && b.longitud === null) return {latitud:null,longitud:null};
    if (typeof b.latitud !== 'number' || !Number.isFinite(b.latitud) || b.latitud < -90 || b.latitud > 90 || typeof b.longitud !== 'number' || !Number.isFinite(b.longitud) || b.longitud < -180 || b.longitud > 180) throw new BadRequestException('Selecciona una latitud y longitud válidas.');
    return {latitud:b.latitud,longitud:b.longitud};
  }
  private async nuevoCodigo(tx: Prisma.TransactionClient, empresaId: string, tipo: 'ubicacion'|'sucursal') {
    const prefijo = tipo === 'ubicacion' ? 'UBI' : 'SUC';
    for (;;) {
      const filas = await tx.$queryRaw<{ultimo_numero:bigint}[]>`INSERT INTO contadores_ubicacion (empresa_id,tipo,ultimo_numero) VALUES (${empresaId}::uuid,${tipo},1) ON CONFLICT (empresa_id,tipo) DO UPDATE SET ultimo_numero=contadores_ubicacion.ultimo_numero+1 RETURNING ultimo_numero`;
      const numero = filas[0].ultimo_numero;
      if (numero > 999999999999n) throw new BadRequestException('Se agotaron los códigos disponibles.');
      const codigo = `${prefijo}-${numero.toString().padStart(6,'0')}`;
      const encontrado = tipo === 'ubicacion' ? await tx.almacen.findFirst({where:{empresaId,codigo:{equals:codigo,mode:'insensitive'}},select:{id:true}}) : await tx.sucursal.findFirst({where:{empresaId,codigo:{equals:codigo,mode:'insensitive'}},select:{id:true}});
      if (!encontrado) return codigo;
    }
  }

  @Get('ubicacion-trabajo') @RequierePermisos('catalogo.productos.leer')
  async ubicacionTrabajo(@SesionActual() s: ContextoAutenticado) {
    const usuario = await this.prisma.usuario.findFirst({where:{id:s.usuarioId,empresaId:s.empresaId,activo:true},select:{ubicacionTrabajoId:true}});
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');
    const ubicacion = usuario.ubicacionTrabajoId ? await this.prisma.almacen.findFirst({where:{id:usuario.ubicacionTrabajoId,empresaId:s.empresaId,activo:true,OR:[{sucursalId:null},{sucursal:{activa:true}}]},select:{id:true,nombre:true,tipo:true,sucursal:{select:{id:true,nombre:true}}}}) : null;
    return {datos:ubicacion};
  }
  @Patch('ubicacion-trabajo') @RequierePermisos('catalogo.productos.leer')
  async seleccionarUbicacionTrabajo(@SesionActual() s: ContextoAutenticado, @Body() b:Record<string,unknown>) {
    const id=b.almacenId;
    if (id !== null && (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) throw new BadRequestException('Selecciona una ubicación válida.');
    if (typeof id === 'string' && !(await this.prisma.almacen.findFirst({where:{id,empresaId:s.empresaId,activo:true,OR:[{sucursalId:null},{sucursal:{activa:true}}]}}))) throw new BadRequestException('La ubicación no existe o está inactiva.');
    const resultado=await this.prisma.usuario.updateMany({where:{id:s.usuarioId,empresaId:s.empresaId,activo:true},data:{ubicacionTrabajoId:id as string|null}});
    if (!resultado.count) throw new NotFoundException('Usuario no encontrado.');
    return this.ubicacionTrabajo(s);
  }

  @Get('sucursales') @RequierePermisos('catalogo.productos.leer')
  async sucursales(@SesionActual() s: ContextoAutenticado) { return { datos: await this.prisma.sucursal.findMany({ where: { empresaId: s.empresaId }, orderBy: { nombre: 'asc' }, include: { _count: { select: { almacenes: true } } } }) }; }

  @Post('sucursales') @RequierePermisos('catalogo.productos.editar')
  async crearSucursal(@SesionActual() s: ContextoAutenticado, @Body() b: Record<string, unknown>) {
    const nombre=this.texto(b.nombre,'El nombre',120), direccion=this.direccion(b.direccion), tipo=b.tipo===undefined?'sin_definir':this.tipoSucursal(b.tipo), coordenadas=this.coordenadas(b);
    try { return await this.prisma.$transaction(async tx => { const codigo=b.codigo == null || b.codigo === '' ? await this.nuevoCodigo(tx,s.empresaId,'sucursal') : this.codigo(b.codigo); return { datos: await tx.sucursal.create({ data: { empresaId:s.empresaId, codigo, nombre, direccion, tipo, ...coordenadas } }) }; }); }
    catch(e) { if ((e as { code?:string }).code === 'P2002') throw new ConflictException('Ya existe una sucursal con ese código.'); throw e; }
  }
  @Patch('sucursales/:id') @RequierePermisos('catalogo.productos.editar')
  async editarSucursal(@SesionActual() s: ContextoAutenticado, @Param('id', ParseUUIDPipe) id:string, @Body() b:Record<string,unknown>) {
    if (!(await this.prisma.sucursal.findFirst({ where:{ id, empresaId:s.empresaId } }))) throw new NotFoundException('No se encontró la sucursal.');
    const data: { nombre?:string; direccion?:string|null; activa?:boolean; tipo?:string; latitud?:number|null; longitud?:number|null } = {};
    if ('nombre' in b) data.nombre = this.texto(b.nombre,'El nombre',120);
    if ('direccion' in b) data.direccion = this.direccion(b.direccion);
    if ('tipo' in b) data.tipo = this.tipoSucursal(b.tipo);
    Object.assign(data,this.coordenadas(b));
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
    const nombre=this.texto(b.nombre,'El nombre',120), direccion=this.direccion(b.direccion), coordenadas=this.coordenadas(b);
    try { return await this.prisma.$transaction(async tx => { const codigo=b.codigo == null || b.codigo === '' ? await this.nuevoCodigo(tx,s.empresaId,'ubicacion') : this.codigo(b.codigo); return { datos: await tx.almacen.create({ data:{ empresaId:s.empresaId,codigo,nombre,direccion,tipo,sucursalId,...coordenadas } }) }; }); }
    catch(e) { if ((e as { code?:string }).code === 'P2002') throw new ConflictException('Ya existe una ubicación con ese código.'); throw e; }
  }
  @Patch('almacenes/:id') @RequierePermisos('catalogo.productos.editar')
  async editarAlmacen(@SesionActual() s:ContextoAutenticado, @Param('id',ParseUUIDPipe) id:string, @Body() b:Record<string,unknown>) {
    if (!(await this.prisma.almacen.findFirst({where:{id,empresaId:s.empresaId}}))) throw new NotFoundException('No se encontró la ubicación.');
    const data:{nombre?:string;direccion?:string|null;tipo?:string;sucursalId?:string|null;activo?:boolean;latitud?:number|null;longitud?:number|null}={};
    if ('nombre' in b) data.nombre=this.texto(b.nombre,'El nombre',120);
    if ('direccion' in b) data.direccion=this.direccion(b.direccion);
    Object.assign(data,this.coordenadas(b));
    if ('tipo' in b) data.tipo=this.tipo(b.tipo);
    if ('sucursalId' in b) data.sucursalId=await this.sucursalId(s.empresaId,b.sucursalId);
    if ('activo' in b) { if (typeof b.activo!=='boolean') throw new BadRequestException('Estado inválido.'); if (!b.activo) { const [stock,traslados]=await Promise.all([this.prisma.existenciaLote.count({where:{empresaId:s.empresaId,almacenId:id,cantidadFisica:{gt:0}}}),this.prisma.traslado.count({where:{empresaId:s.empresaId,estado:{in:['preparando','en_camino']},OR:[{almacenOrigenId:id},{almacenDestinoId:id}]}})]); if(stock || traslados) throw new BadRequestException('La ubicación tiene stock o traslados pendientes.'); } data.activo=b.activo; }
    if (!Object.keys(data).length) throw new BadRequestException('No se recibieron cambios.');
    return {datos:await this.prisma.almacen.update({where:{id},data})};
  }
  private tipo(v:unknown) { if (v !== 'almacen' && v !== 'tienda') throw new BadRequestException('Selecciona almacén o tienda.'); return v; }
  private async sucursalId(empresaId:string,v:unknown):Promise<string|null> { if(v==null || v==='') return null; if(typeof v!=='string' || !/^[0-9a-f-]{36}$/i.test(v)) throw new BadRequestException('Sucursal inválida.'); if(!(await this.prisma.sucursal.findFirst({where:{id:v,empresaId,activa:true}}))) throw new BadRequestException('La sucursal no existe o está inactiva.'); return v; }
}
