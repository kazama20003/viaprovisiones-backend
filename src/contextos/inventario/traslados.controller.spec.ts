jest.mock('../../compartido/infraestructura/prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }));
import { BadRequestException, ConflictException } from '@nestjs/common';
import { TrasladosController } from './traslados.controller';

describe('TrasladosController', () => {
  const sesion = { empresaId:'empresa', usuarioId:'usuario' } as any;
  const base = { id:'traslado', estado:'preparando', almacenOrigenId:'origen', almacenDestinoId:'destino', almacenOrigen:{activo:true}, almacenDestino:{activo:true}, lineas:[{id:'linea',loteId:'lote',productoId:'producto',cantidadEnviada:3,lote:{estado:'disponible',costoUnitario:2}}] };
  const crear = (t:any, cantidadActualizada=1, claim=1) => {
    const tx:any={ traslado:{findFirst:jest.fn().mockResolvedValue(t),updateMany:jest.fn().mockResolvedValue({count:claim})}, $executeRaw:jest.fn().mockResolvedValue(cantidadActualizada), movimientoInventario:{create:jest.fn()}, existenciaLote:{upsert:jest.fn()}, lineaTraslado:{update:jest.fn()} };
    const prisma:any={$transaction:jest.fn((fn:any)=>fn(tx))};
    return {controller:new TrasladosController(prisma),tx};
  };
  it('rechaza envíos sin existencias disponibles', async () => {const {controller,tx}=crear(base,0);await expect(controller.enviar(sesion,'traslado')).rejects.toBeInstanceOf(BadRequestException);expect(tx.movimientoInventario.create).not.toHaveBeenCalled();});
  it('registra la salida al enviar', async () => {const {controller,tx}=crear(base);await controller.enviar(sesion,'traslado');expect(tx.movimientoInventario.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({tipo:'traslado_salida',cantidad:3,empresaId:'empresa'})}));});
  it('impide recibir dos veces', async () => {const {controller,tx}=crear({...base,estado:'recibido'});await expect(controller.recibir(sesion,'traslado')).rejects.toBeInstanceOf(BadRequestException);expect(tx.existenciaLote.upsert).not.toHaveBeenCalled();});
  it('rechaza una recepción tomada por otra operación', async () => {const {controller,tx}=crear({...base,estado:'en_camino'},1,0);await expect(controller.recibir(sesion,'traslado')).rejects.toBeInstanceOf(ConflictException);expect(tx.existenciaLote.upsert).not.toHaveBeenCalled();});
  it('ingresa la cantidad enviada en el destino', async () => {const {controller,tx}=crear({...base,estado:'en_camino'});await controller.recibir(sesion,'traslado');expect(tx.existenciaLote.upsert).toHaveBeenCalledWith(expect.objectContaining({create:expect.objectContaining({almacenId:'destino',cantidadFisica:3})}));expect(tx.lineaTraslado.update).toHaveBeenCalledWith(expect.objectContaining({data:{cantidadRecibida:3}}));});
});
