import { BadRequestException, Body, ConflictException, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../compartido/infraestructura/prisma/prisma.service';
import { PermisoGuard, RequierePermisos, SesionActual, SesionGuard } from '../acceso/sesion.guard';
import type { ContextoAutenticado } from '../acceso/sesion.guard';
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const numero=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=999999&&Math.abs(v*1000-Math.round(v*1000))<0.000001;
@Controller('inventario')
@UseGuards(SesionGuard,PermisoGuard)
export class KardexController {
 constructor(private readonly prisma:PrismaService) {}
 @Get('existencias') @RequierePermisos('catalogo.productos.leer')
 async existencias(@SesionActual() s:ContextoAutenticado,@Query('buscar') buscar?:string) {
  if(buscar && buscar.length>100) throw new BadRequestException('Búsqueda demasiado larga.');
  const termino=buscar?.trim();
  const datos=await this.prisma.existenciaLote.findMany({where:{empresaId:s.empresaId,...(termino?{OR:[{lote:{codigo:{contains:termino,mode:'insensitive'}}},{lote:{producto:{nombre:{contains:termino,mode:'insensitive'}}}},{lote:{producto:{sku:{contains:termino,mode:'insensitive'}}}}]}:{})},orderBy:{actualizadoEn:'desc'},take:101,include:{almacen:{select:{id:true,nombre:true,activo:true}},lote:{select:{id:true,codigo:true,varianteId:true,producto:{select:{id:true,nombre:true,sku:true}},variante:{select:{atributos:true,sku:true}}}}}});
  return {datos:datos.slice(0,100).map(x=>({...x,cantidadFisica:Number(x.cantidadFisica),cantidadReservada:Number(x.cantidadReservada)})),hayMas:datos.length>100};
 }
 @Get('kardex') @RequierePermisos('catalogo.productos.leer')
 async kardex(@SesionActual() s:ContextoAutenticado,@Query() q:Record<string,string>) {
  const {productoId,varianteId,loteId,almacenId,tipo}=q;
  for(const v of [productoId,varianteId,loteId,almacenId]) if(v&&!uuid(v)) throw new BadRequestException('Filtro inválido.');
  const tipos=['recepcion','venta','reserva','liberacion','devolucion','ajuste','traslado_salida','traslado_entrada','reversion'];
  if(tipo&&!tipos.includes(tipo)) throw new BadRequestException('Tipo de movimiento inválido.');
  const pagina=q.pagina?Number(q.pagina):1;if(!Number.isInteger(pagina)||pagina<1||pagina>100000)throw new BadRequestException('Página inválida.');
  const where:any={empresaId:s.empresaId,...(productoId?{productoId}:{}),...(loteId?{loteId}:{}),...(almacenId?{almacenId}:{}),...(varianteId?{lote:{varianteId}}:{}),...(tipo?{tipo}:{})};
  const [total,datos]=await this.prisma.$transaction(async tx=>{
   const total=await tx.movimientoInventario.count({where});
   const movimientos=await tx.movimientoInventario.findMany({where,orderBy:[{creadoEn:'desc'},{id:'desc'}],skip:(pagina-1)*50,take:50});
   const productos=await tx.producto.findMany({where:{id:{in:movimientos.map(m=>m.productoId)},empresaId:s.empresaId},select:{id:true,nombre:true,sku:true}});
   const lotes=await tx.lote.findMany({where:{id:{in:movimientos.map(m=>m.loteId)},empresaId:s.empresaId},select:{id:true,codigo:true,varianteId:true}});
   const variantes=await tx.varianteProducto.findMany({where:{id:{in:lotes.flatMap(l=>l.varianteId?[l.varianteId]:[])},empresaId:s.empresaId},select:{id:true,sku:true,atributos:true}});
   const almacenes=await tx.almacen.findMany({where:{id:{in:movimientos.map(m=>m.almacenId)},empresaId:s.empresaId},select:{id:true,nombre:true}});
   const traslados=await tx.traslado.findMany({where:{id:{in:movimientos.flatMap(m=>m.trasladoId?[m.trasladoId]:[])},empresaId:s.empresaId},select:{id:true,numero:true}});
   const datos=movimientos.map(m=>{const lote=lotes.find(l=>l.id===m.loteId);return {...m,producto:productos.find(p=>p.id===m.productoId),lote:lote?{...lote,variante:variantes.find(v=>v.id===lote.varianteId)||null}:null,almacen:almacenes.find(a=>a.id===m.almacenId),traslado:traslados.find(t=>t.id===m.trasladoId)||null};});
   return [total,datos] as const;
  },{isolationLevel:'RepeatableRead'});
  return {datos:datos.map(m=>({...m,cantidad:Number(m.cantidad),costoUnitario:m.costoUnitario===null?null:Number(m.costoUnitario)})),pagina,total};
 }
 @Get('conteos') @RequierePermisos('catalogo.productos.leer')
 async conteos(@SesionActual() s:ContextoAutenticado) {const datos=await this.prisma.conteoInventario.findMany({where:{empresaId:s.empresaId},orderBy:{creadoEn:'desc'},take:100,include:{lote:{select:{codigo:true,producto:{select:{nombre:true}},variante:{select:{atributos:true}}}},almacen:{select:{nombre:true}},usuario:{select:{nombre:true}}}});return {datos:datos.map(x=>({...x,stockAnterior:Number(x.stockAnterior),stockReservado:Number(x.stockReservado),stockContado:Number(x.stockContado),diferencia:Number(x.diferencia)}))};}
 @Post('conteos') @RequierePermisos('catalogo.productos.editar')
 async contar(@SesionActual() s:ContextoAutenticado,@Body() b:Record<string,unknown>) {
  const {loteId,almacenId,stockEsperado,reservadoEsperado,contado,motivo}=b;
  if(!uuid(loteId)||!uuid(almacenId)||!numero(stockEsperado)||!numero(reservadoEsperado)||!numero(contado))throw new BadRequestException('Indica lote, ubicación y cantidades válidas.');
  if(motivo!=null&&(typeof motivo!=='string'||motivo.trim().length>250))throw new BadRequestException('El motivo admite hasta 250 caracteres.');
  const diferencia=(Math.round(contado*1000)-Math.round(stockEsperado*1000))/1000;
  if(diferencia!==0&&(typeof motivo!=='string'||!motivo.trim()))throw new BadRequestException('Indica el motivo de la diferencia.');
  try{return await this.prisma.$transaction(async tx=>{
   const stock=await tx.existenciaLote.findFirst({where:{empresaId:s.empresaId,loteId,almacenId},include:{lote:true,almacen:true}});
   if(!stock||!stock.almacen.activo)throw new BadRequestException('No se encontró la existencia en una ubicación activa.');
   if(contado<Number(stock.cantidadReservada))throw new BadRequestException('El conteo no puede ser menor que el stock reservado.');
   const updated=await tx.existenciaLote.updateMany({where:{id:stock.id,empresaId:s.empresaId,cantidadFisica:stockEsperado,cantidadReservada:reservadoEsperado},data:{cantidadFisica:contado}});
   if(!updated.count)throw new ConflictException('El stock cambió desde que se abrió el conteo. Actualiza y vuelve a contar.');
   const registro=await tx.conteoInventario.create({data:{empresaId:s.empresaId,loteId,almacenId,usuarioId:s.usuarioId,stockAnterior:stockEsperado,stockReservado:reservadoEsperado,stockContado:contado,diferencia,motivo:typeof motivo==='string'?motivo.trim()||null:null}});
   if(diferencia!==0)await tx.movimientoInventario.create({data:{empresaId:s.empresaId,productoId:stock.lote.productoId,loteId,almacenId,tipo:'ajuste',sentido:diferencia>0?'entrada':'salida',cantidad:Math.abs(diferencia),costoUnitario:stock.lote.costoUnitario,usuarioId:s.usuarioId,motivo:`Conteo físico: ${(motivo as string).trim()}`.slice(0,250)}});
   return {datos:{id:registro.id,diferencia}};
  },{isolationLevel:'Serializable'});}catch(e){if((e as {code?:string}).code==='P2034')throw new ConflictException('El stock cambió. Actualiza y vuelve a contar.');throw e;}
 }
}
