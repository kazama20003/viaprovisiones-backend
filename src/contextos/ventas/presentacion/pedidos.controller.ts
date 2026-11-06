import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
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
        cliente: { select: { nombre: true, tipoCliente: true, telefono: true } },
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

  @Get('metricas')
  @RequierePermisos('ventas.pedidos.leer')
  async metricas(@SesionActual() sesion:ContextoAutenticado){
    const eventos=await this.prisma.historialEstadoDocumento.findMany({where:{empresaId:sesion.empresaId,tipoDocumento:'pedido',estadoNuevo:{in:['por_pagar','pagado','preparando','enviado','entregado']}},orderBy:{cambiadoEn:'desc'},take:5000,select:{documentoId:true,estadoNuevo:true,cambiadoEn:true}});
    const porPedido=new Map<string,typeof eventos>();for(const e of eventos){const actual=porPedido.get(e.documentoId)||[];actual.push(e);porPedido.set(e.documentoId,actual)}
    const duracion=(inicio:string,fin:string)=>{const minutos:number[]=[];for(const lista of porPedido.values()){const a=lista.find(x=>x.estadoNuevo===inicio),b=lista.find(x=>x.estadoNuevo===fin);if(a&&b&&b.cambiadoEn>=a.cambiadoEn)minutos.push((b.cambiadoEn.getTime()-a.cambiadoEn.getTime())/60000)}return minutos.length?Math.round(minutos.reduce((a,b)=>a+b,0)/minutos.length):null};
    const hoy=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const ids=[...new Set(eventos.filter(e=>e.estadoNuevo==='entregado'&&new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(e.cambiadoEn)===hoy).map(e=>e.documentoId))];
    const entregas=await this.prisma.pedido.findMany({where:{empresaId:sesion.empresaId,id:{in:ids}},select:{metodoEntrega:true}});
    return {datos:{confirmarPagoMinutos:duracion('por_pagar','pagado'),preparacionMinutos:duracion('preparando','enviado'),entregaMinutos:duracion('enviado','entregado'),entregasHoy:{recojo:entregas.filter(x=>x.metodoEntrega==='recojo').length,delivery:entregas.filter(x=>x.metodoEntrega==='delivery').length,agencia:entregas.filter(x=>x.metodoEntrega==='agencia').length},limiteEventos:5000}};
  }

  @Get(':id')
  @RequierePermisos('ventas.pedidos.leer')
  async detalle(@SesionActual() sesion: ContextoAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    const pedido = await this.prisma.pedido.findFirst({where:{id,empresaId:sesion.empresaId},include:{cliente:{select:{nombre:true,tipoCliente:true,numeroDocumento:true,tipoDocumento:true,telefono:true,correo:true}},lineas:{include:{movimientos:{where:{empresaId:sesion.empresaId,tipo:'venta'},select:{cantidad:true,sentido:true,lote:{select:{codigo:true}},almacen:{select:{nombre:true}}}}}},cobros:{select:{monto:true,medioPago:true,recibidoEn:true,referencia:true}},cuentaPorCobrar:{select:{id:true,estado:true,fechaVencimiento:true}},envios:{select:{estado:true,transportista:true,codigoSeguimiento:true,despachadoEn:true,entregadoEn:true}}}});
    if(!pedido) throw new NotFoundException('No se encontró el pedido.');
    const historial=await this.prisma.historialEstadoDocumento.findMany({where:{empresaId:sesion.empresaId,tipoDocumento:'pedido',documentoId:id},orderBy:{cambiadoEn:'asc'},select:{estadoAnterior:true,estadoNuevo:true,cambiadoEn:true,cambiadoPor:{select:{nombre:true}}}});
    return {datos:{...pedido,subtotal:Number(pedido.subtotal),descuento:Number(pedido.descuento),impuesto:Number(pedido.impuesto),costoEnvio:Number(pedido.costoEnvio),total:Number(pedido.total),lineas:pedido.lineas.map(l=>({...l,cantidad:Number(l.cantidad),precioUnitario:Number(l.precioUnitario),descuento:Number(l.descuento),tasaIgv:Number(l.tasaIgv),totalLinea:Number(l.totalLinea),costoUnitarioHistorico:l.costoUnitarioHistorico==null?null:Number(l.costoUnitarioHistorico),movimientos:l.movimientos.map(m=>({...m,cantidad:Number(m.cantidad)}))})),cobros:pedido.cobros.map(c=>({...c,monto:Number(c.monto)})),historial}};
  }

  @Post(':id/transiciones')
  @RequierePermisos('ventas.pedidos.transicionar')
  async transicionar(
    @Param('id', ParseUUIDPipe) id: string,
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
      const cambio = await tx.pedido.updateMany({ where: { id: pedido.id, empresaId: sesion.empresaId, estado: pedido.estado }, data: { estado: destino as never } });
      if (!cambio.count) throw new ConflictException('El pedido cambió. Actualiza la página.');
      const nuevo = await tx.pedido.findUniqueOrThrow({where:{id:pedido.id}});
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
