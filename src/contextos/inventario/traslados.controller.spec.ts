jest.mock('../../compartido/infraestructura/prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }));
import { BadRequestException, ConflictException } from '@nestjs/common';
import { TrasladosController } from './traslados.controller';

describe('TrasladosController', () => {
  const sesion = { empresaId:'empresa', usuarioId:'usuario' } as any;
  const lineaId='11111111-1111-4111-8111-111111111111';
  const base = { id:'traslado', estado:'en_camino', almacenOrigenId:'origen', almacenDestinoId:'destino', almacenOrigen:{activo:true}, almacenDestino:{activo:true}, lineas:[{id:lineaId,loteId:'lote',productoId:'producto',cantidadEnviada:10,cantidadRecibida:0,lote:{estado:'disponible',costoUnitario:2}}] };
  const crear = (t:any, cantidadActualizada=1, claim=1) => {
    const tx:any={ traslado:{findFirst:jest.fn().mockResolvedValue(t),updateMany:jest.fn().mockResolvedValue({count:claim})}, $executeRaw:jest.fn().mockResolvedValue(cantidadActualizada), movimientoInventario:{create:jest.fn()}, existenciaLote:{upsert:jest.fn()}, almacen:{count:jest.fn().mockResolvedValue(2)}, lineaTraslado:{findMany:jest.fn().mockResolvedValue(t.lineas),updateMany:jest.fn().mockResolvedValue({count:1})} };
    const prisma:any={$transaction:jest.fn((fn:any)=>fn(tx))};
    return {controller:new TrasladosController(prisma),tx};
  };
  const body=(cantidad:number)=>({lineas:[{lineaId,cantidad}]});
  it('rechaza envíos sin existencias disponibles', async () => {const {controller,tx}=crear({...base,estado:'preparando'},0);await expect(controller.enviar(sesion,'traslado')).rejects.toBeInstanceOf(BadRequestException);expect(tx.movimientoInventario.create).not.toHaveBeenCalled();});
  it('registra únicamente lo recibido y deja el resto en tránsito', async () => {const {controller,tx}=crear(base);const r=await controller.recibir(sesion,'traslado',body(8));expect(r.datos.estado).toBe('en_camino');expect(tx.existenciaLote.upsert).toHaveBeenCalledWith(expect.objectContaining({create:expect.objectContaining({almacenId:'destino',cantidadFisica:8})}));expect(tx.lineaTraslado.updateMany).toHaveBeenCalledWith(expect.objectContaining({data:{cantidadRecibida:{increment:8}}}));expect(tx.movimientoInventario.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({cantidad:8,tipo:'traslado_entrada'})}));});
  it('completa el traslado al recibir el saldo restante', async () => {const {controller}=crear({...base,lineas:[{...base.lineas[0],cantidadRecibida:8}]});const r=await controller.recibir(sesion,'traslado',body(2));expect(r.datos.estado).toBe('recibido');});
  it('rechaza recibir más de lo pendiente sin modificar stock', async () => {const {controller,tx}=crear({...base,lineas:[{...base.lineas[0],cantidadRecibida:8}]});await expect(controller.recibir(sesion,'traslado',body(3))).rejects.toBeInstanceOf(BadRequestException);expect(tx.existenciaLote.upsert).not.toHaveBeenCalled();});
  it('rechaza líneas repetidas o ajenas', async () => {const {controller,tx}=crear(base);await expect(controller.recibir(sesion,'traslado',{lineas:[...body(1).lineas,...body(1).lineas]})).rejects.toBeInstanceOf(BadRequestException);await expect(controller.recibir(sesion,'traslado',{lineas:[{lineaId:'22222222-2222-4222-8222-222222222222',cantidad:1}]})).rejects.toBeInstanceOf(BadRequestException);expect(tx.existenciaLote.upsert).not.toHaveBeenCalled();});
  it('impide recibir un traslado cerrado', async () => {const {controller,tx}=crear({...base,estado:'recibido'});await expect(controller.recibir(sesion,'traslado',body(1))).rejects.toBeInstanceOf(BadRequestException);expect(tx.existenciaLote.upsert).not.toHaveBeenCalled();});
  it('rechaza una recepción tomada por otra operación', async () => {const {controller,tx}=crear(base,1,0);await expect(controller.recibir(sesion,'traslado',body(1))).rejects.toBeInstanceOf(ConflictException);expect(tx.existenciaLote.upsert).not.toHaveBeenCalled();});
  it('exige motivo y registra el cierre con diferencia sin agregar stock', async () => {const {controller,tx}=crear(base);await expect(controller.cerrarConDiferencia(sesion,'traslado',{motivo:'  '})).rejects.toBeInstanceOf(BadRequestException);await controller.cerrarConDiferencia(sesion,'traslado',{motivo:'Faltante en transporte'});expect(tx.traslado.updateMany).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({motivoDiferencia:'Faltante en transporte'})}));expect(tx.existenciaLote.upsert).not.toHaveBeenCalled();});
});
