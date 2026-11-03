import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../compartido/infraestructura/prisma/prisma.service';
import { PermisoGuard, RequierePermisos, SesionActual, SesionGuard } from '../acceso/sesion.guard';
import type { ContextoAutenticado } from '../acceso/sesion.guard';
const uuid = (v:unknown):v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const cantidadValida = (v:unknown):v is number => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 999999 && Math.abs(v * 1000 - Math.round(v * 1000)) < 0.000001;

@Controller('inventario/traslados')
@UseGuards(SesionGuard, PermisoGuard)
export class TrasladosController {
  constructor(private readonly prisma:PrismaService) {}
  @Get() @RequierePermisos('catalogo.productos.leer')
  async listar(@SesionActual() s:ContextoAutenticado) {
    const datos=await this.prisma.traslado.findMany({where:{empresaId:s.empresaId},orderBy:{creadoEn:'desc'},take:100,include:{movimientos:{where:{tipo:'traslado_entrada'},orderBy:{creadoEn:'desc'},select:{id:true,loteId:true,cantidad:true,creadoEn:true,usuarioId:true}},almacenOrigen:{select:{id:true,nombre:true}},almacenDestino:{select:{id:true,nombre:true}},lineas:{include:{producto:{select:{nombre:true,sku:true}},lote:{select:{codigo:true,variante:{select:{atributos:true,sku:true}}}}}}}});
    return {datos:datos.map(t=>({...t,movimientos:t.movimientos.map(m=>({...m,cantidad:Number(m.cantidad)})),lineas:t.lineas.map(l=>({...l,cantidadEnviada:Number(l.cantidadEnviada),cantidadRecibida:Number(l.cantidadRecibida)}))}))};
  }
  @Post() @RequierePermisos('catalogo.productos.editar')
  async crear(@SesionActual() s:ContextoAutenticado,@Body() b:Record<string,unknown>) {
    const {origenId,destinoId,lineas,observaciones}=b;
    if(!uuid(origenId)||!uuid(destinoId)||origenId===destinoId) throw new BadRequestException('Selecciona ubicaciones diferentes.');
    if(!Array.isArray(lineas)||!lineas.length||lineas.length>50) throw new BadRequestException('Agrega de 1 a 50 lotes.');
    if(observaciones!=null && (typeof observaciones!=='string'||observaciones.length>500)) throw new BadRequestException('Las observaciones admiten hasta 500 caracteres.');
    const items=lineas.map((x:unknown)=>{ if(!x||typeof x!=='object'||Array.isArray(x)) throw new BadRequestException('Línea inválida.'); const {loteId,cantidad}=x as Record<string,unknown>; if(!uuid(loteId)||!cantidadValida(cantidad)) throw new BadRequestException('Indica un lote y una cantidad válidos.'); return {loteId,cantidad}; });
    if(new Set(items.map(x=>x.loteId)).size!==items.length) throw new BadRequestException('No repitas un lote en el traslado.');
    return this.transaccion(async tx=>{
      const ubicaciones=await tx.almacen.count({where:{empresaId:s.empresaId,activo:true,id:{in:[origenId,destinoId]}}}); if(ubicaciones!==2) throw new BadRequestException('Las ubicaciones deben estar activas y pertenecer a la empresa.');
      const datos=[] as {loteId:string;productoId:string;cantidadEnviada:number}[];
      for(const item of items){ const lote=await tx.lote.findFirst({where:{id:item.loteId,empresaId:s.empresaId,estado:'disponible'},include:{existencias:{where:{empresaId:s.empresaId,almacenId:origenId}}}}); const existencia=lote?.existencias[0]; if(!lote||!existencia||Number(existencia.cantidadFisica)-Number(existencia.cantidadReservada)<item.cantidad) throw new BadRequestException('Uno de los lotes no tiene stock disponible suficiente en el origen.'); datos.push({loteId:lote.id,productoId:lote.productoId,cantidadEnviada:item.cantidad}); }
      const traslado=await tx.traslado.create({data:{empresaId:s.empresaId,almacenOrigenId:origenId,almacenDestinoId:destinoId,creadoPorId:s.usuarioId,numero:`TR-${randomUUID().slice(0,12).toUpperCase()}`,observaciones:typeof observaciones==='string'?observaciones.trim()||null:null,lineas:{create:datos}}}); return {datos:{id:traslado.id,numero:traslado.numero,estado:traslado.estado}};
    });
  }
  @Post(':id/enviar') @RequierePermisos('catalogo.productos.editar')
  async enviar(@SesionActual() s:ContextoAutenticado,@Param('id',ParseUUIDPipe) id:string) {
    return this.transaccion(async tx=>{
      const t=await tx.traslado.findFirst({where:{id,empresaId:s.empresaId},include:{lineas:{include:{lote:{select:{costoUnitario:true,estado:true}}}},almacenOrigen:true,almacenDestino:true}}); if(!t) throw new NotFoundException('No se encontró el traslado.'); if(t.estado!=='preparando') throw new BadRequestException('Solo se puede enviar un traslado en preparación.'); if(!t.almacenOrigen.activo||!t.almacenDestino.activo) throw new BadRequestException('Las ubicaciones deben estar activas.');
      const claimed=await tx.traslado.updateMany({where:{id,empresaId:s.empresaId,estado:'preparando'},data:{estado:'en_camino'}}); if(!claimed.count) throw new ConflictException('El traslado ya cambió de estado.');
      for(const l of t.lineas){ if(l.lote.estado!=='disponible') throw new BadRequestException('Un lote ya no está disponible.'); const n=Number(l.cantidadEnviada); const changed=await tx.$executeRaw`UPDATE existencias_lotes SET cantidad_fisica=cantidad_fisica-${n}, actualizado_en=NOW() WHERE empresa_id=${s.empresaId}::uuid AND lote_id=${l.loteId}::uuid AND almacen_id=${t.almacenOrigenId}::uuid AND cantidad_fisica-cantidad_reservada>=${n}`; if(!changed) throw new BadRequestException('No hay stock disponible suficiente para enviar el traslado.'); await tx.movimientoInventario.create({data:{empresaId:s.empresaId,productoId:l.productoId,loteId:l.loteId,almacenId:t.almacenOrigenId,tipo:'traslado_salida',sentido:'salida',cantidad:n,costoUnitario:l.lote.costoUnitario,usuarioId:s.usuarioId,trasladoId:id}}); }
      return {datos:{id,estado:'en_camino'}};
    });
  }
  @Post(':id/recibir') @RequierePermisos('catalogo.productos.editar')
  async recibir(@SesionActual() s:ContextoAutenticado,@Param('id',ParseUUIDPipe) id:string,@Body() body:Record<string,unknown>) {
    if(!body || !Array.isArray(body.lineas) || body.lineas.length<1 || body.lineas.length>50) throw new BadRequestException('Indica las cantidades recibidas por lote.');
    const items=body.lineas.map((v:unknown)=>{if(!v||typeof v!=='object'||Array.isArray(v)) throw new BadRequestException('Línea de recepción inválida.');const {lineaId,cantidad}=v as Record<string,unknown>;if(!uuid(lineaId)||!cantidadValida(cantidad)) throw new BadRequestException('Indica cantidades recibidas mayores que cero, con hasta tres decimales.');return {lineaId,cantidad};});
    if(new Set(items.map(x=>x.lineaId)).size!==items.length) throw new BadRequestException('No repitas una línea.');
    return this.transaccion(async tx=>{
      const t=await tx.traslado.findFirst({where:{id,empresaId:s.empresaId},include:{lineas:{include:{lote:{select:{costoUnitario:true}}}},almacenDestino:true}});
      if(!t) throw new NotFoundException('No se encontró el traslado.');
      if(t.estado!=='en_camino') throw new BadRequestException('Solo se puede recibir un traslado en camino.');
      if(!t.almacenDestino.activo) throw new BadRequestException('El destino está inactivo.');
      const cantidades=new Map(items.map(x=>[x.lineaId,x.cantidad]));
      for(const item of items){const l=t.lineas.find(x=>x.id===item.lineaId);if(!l) throw new BadRequestException('Una línea no pertenece al traslado.');const pendiente=Math.round(Number(l.cantidadEnviada)*1000)-Math.round(Number(l.cantidadRecibida)*1000);if(Math.round(item.cantidad*1000)>pendiente) throw new BadRequestException('La cantidad supera lo pendiente de recibir.');}
      const completo=t.lineas.every(l=>Math.round(Number(l.cantidadRecibida)*1000)+Math.round((cantidades.get(l.id)||0)*1000)===Math.round(Number(l.cantidadEnviada)*1000));
      const claimed=await tx.traslado.updateMany({where:{id,empresaId:s.empresaId,estado:'en_camino'},data:completo?{estado:'recibido',recibidoPorId:s.usuarioId,recibidoEn:new Date()}:{estado:'en_camino'}});
      if(!claimed.count) throw new ConflictException('El traslado ya cambió de estado.');
      for(const item of items){const l=t.lineas.find(x=>x.id===item.lineaId)!;const n=item.cantidad;
        const updated=await tx.lineaTraslado.updateMany({where:{id:l.id,trasladoId:id,cantidadRecibida:l.cantidadRecibida},data:{cantidadRecibida:{increment:n}}});if(!updated.count) throw new ConflictException('La recepción cambió. Actualiza e inténtalo de nuevo.');
        await tx.existenciaLote.upsert({where:{loteId_almacenId:{loteId:l.loteId,almacenId:t.almacenDestinoId}},create:{empresaId:s.empresaId,loteId:l.loteId,almacenId:t.almacenDestinoId,cantidadFisica:n},update:{cantidadFisica:{increment:n}}});
        await tx.movimientoInventario.create({data:{empresaId:s.empresaId,productoId:l.productoId,loteId:l.loteId,almacenId:t.almacenDestinoId,tipo:'traslado_entrada',sentido:'entrada',cantidad:n,costoUnitario:l.lote.costoUnitario,usuarioId:s.usuarioId,trasladoId:id}});
      }
      return {datos:{id,estado:completo?'recibido':'en_camino'}};
    });
  }
  @Post(':id/cerrar-con-diferencia') @RequierePermisos('catalogo.productos.editar')
  async cerrarConDiferencia(@SesionActual() s:ContextoAutenticado,@Param('id',ParseUUIDPipe) id:string,@Body() body:Record<string,unknown>) {
    const motivo=body?.motivo;
    if(typeof motivo!=='string'||!motivo.trim()||motivo.trim().length>500) throw new BadRequestException('Indica el motivo de la diferencia (hasta 500 caracteres).');
    return this.transaccion(async tx=>{
      const t=await tx.traslado.findFirst({where:{id,empresaId:s.empresaId},include:{lineas:true}});
      if(!t) throw new NotFoundException('No se encontró el traslado.');
      if(t.estado!=='en_camino'||!t.lineas.some(l=>Number(l.cantidadRecibida)<Number(l.cantidadEnviada))) throw new BadRequestException('El traslado no tiene cantidades pendientes.');
      const updated=await tx.traslado.updateMany({where:{id,empresaId:s.empresaId,estado:'en_camino'},data:{estado:'recibido',recibidoPorId:s.usuarioId,recibidoEn:new Date(),motivoDiferencia:motivo.trim()}});
      if(!updated.count) throw new ConflictException('El traslado ya cambió de estado.');
      return {datos:{id,estado:'recibido'}};
    });
  }
  @Post(':id/cancelar') @RequierePermisos('catalogo.productos.editar')
  async cancelar(@SesionActual() s:ContextoAutenticado,@Param('id',ParseUUIDPipe) id:string) { const r=await this.prisma.traslado.updateMany({where:{id,empresaId:s.empresaId,estado:'preparando'},data:{estado:'cancelado'}}); if(!r.count) throw new BadRequestException('Solo puedes cancelar un traslado en preparación.'); return {datos:{id,estado:'cancelado'}}; }
  private async transaccion<T>(fn:(tx:import('../../generated/prisma/client').Prisma.TransactionClient)=>Promise<T>):Promise<T> { try { return await this.prisma.$transaction(fn,{isolationLevel:'Serializable'}); } catch(e) { if((e as {code?:string}).code==='P2034') throw new ConflictException('El inventario cambió al mismo tiempo. Actualiza e inténtalo de nuevo.'); throw e; } }
}
