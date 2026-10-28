import { BadRequestException } from '@nestjs/common';
import { InventarioController } from './inventario.controller';
import type { PrismaService } from '../../compartido/infraestructura/prisma/prisma.service';
jest.mock('../../compartido/infraestructura/prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('ingreso de lote por variante', () => {
  const sesion = { sesionId:'s', empresaId:'empresa', usuarioId:'u', roles:[], permisos:[] };
  const varianteId = '11111111-1111-4111-8111-111111111111';
  const tx = { varianteProducto:{ count:jest.fn(), findFirst:jest.fn() } };
  const prisma = { producto:{ findFirst:jest.fn().mockResolvedValue({ id:'p' }) }, $transaction:jest.fn(fn => fn(tx)) };
  const controller = new InventarioController(prisma as unknown as PrismaService);
  const datos = { productoId:'p', cantidad:1, costoUnitario:2, fechaIngreso:'2026-10-28', ubicacion:'Almacén', revisar:false };
  beforeEach(() => { jest.clearAllMocks(); tx.varianteProducto.count.mockResolvedValue(1); });
  it('exige la variante cuando el producto tiene variantes activas', async () => {
    await expect(controller.registrar(sesion, datos)).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.varianteProducto.findFirst).not.toHaveBeenCalled();
  });
  it('rechaza una variante que no pertenece al producto y la empresa', async () => {
    tx.varianteProducto.findFirst.mockResolvedValue(null);
    await expect(controller.registrar(sesion, { ...datos, varianteId })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.varianteProducto.findFirst).toHaveBeenCalledWith({ where:{ id:varianteId, empresaId:'empresa', productoId:'p', activa:true } });
  });
});
