import { ConflictException, NotFoundException } from '@nestjs/common';
import { MarcasController } from './marcas.controller';
import type { PrismaService } from '../../../compartido/infraestructura/prisma/prisma.service';
jest.mock('../../../compartido/infraestructura/prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('administración de marcas', () => {
  const session = { sesionId:'s', empresaId:'empresa', usuarioId:'u', roles:[], permisos:[] };
  const id = '11111111-1111-4111-8111-111111111111';
  const marca = { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() };
  const producto = { updateMany: jest.fn() };
  const prisma = { marca, producto, $transaction: jest.fn(fn => fn({ marca, producto })) };
  const controller = new MarcasController(prisma as unknown as PrismaService);
  beforeEach(() => jest.clearAllMocks());
  it('impide nombres duplicados en la misma empresa', async () => {
    marca.findFirst.mockResolvedValueOnce({ id });
    await expect(controller.crear(session, { nombre: 'Philips' })).rejects.toBeInstanceOf(ConflictException);
    expect(marca.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ empresaId:'empresa', nombre:{ equals:'Philips', mode:'insensitive' } }) }));
  });
  it('rechaza editar una marca que no pertenece a la empresa', async () => {
    marca.findFirst.mockResolvedValueOnce(null);
    await expect(controller.editar(session, id, { activa:false })).rejects.toBeInstanceOf(NotFoundException);
  });
  it('al renombrar conserva la relación de los productos de la empresa', async () => {
    marca.findFirst.mockResolvedValueOnce({ id, nombre:'Anterior' }).mockResolvedValueOnce(null);
    marca.update.mockResolvedValueOnce({ id, nombre:'Nueva' });
    producto.updateMany.mockResolvedValueOnce({ count:1 });
    await controller.editar(session, id, { nombre:'Nueva' });
    expect(producto.updateMany).toHaveBeenCalledWith({ where:{ empresaId:'empresa', marca:{ equals:'Anterior', mode:'insensitive' } }, data:{ marca:'Nueva' } });
  });
});
