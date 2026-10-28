import { BadRequestException } from '@nestjs/common';
import { CategoriasController } from './categorias.controller';
import type { PrismaService } from '../../../compartido/infraestructura/prisma/prisma.service';

jest.mock('../../../compartido/infraestructura/prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('jerarquía de categorías', () => {
  const padre = '11111111-1111-4111-8111-111111111111';
  const hijo = '22222222-2222-4222-8222-222222222222';
  const sesion = { sesionId: 's', empresaId: 'empresa', usuarioId: 'u', roles: [], permisos: [] };
  const prisma = { categoria: { findFirst: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() } };
  const controller = new CategoriasController(prisma as unknown as PrismaService);
  beforeEach(() => jest.resetAllMocks());

  it('crea una subcategoría bajo una categoría activa de la empresa', async () => {
    prisma.categoria.findFirst.mockResolvedValueOnce({ activa: true, categoriaPadreId: null }).mockResolvedValueOnce(null);
    prisma.categoria.create.mockResolvedValue({ id: hijo, categoriaPadreId: padre });
    await controller.crear(sesion, { nombre: 'Linternas', categoriaPadreId: padre });
    expect(prisma.categoria.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ empresaId: 'empresa', categoriaPadreId: padre }) }));
  });

  it('rechaza una categoría superior ajena o inexistente', async () => {
    prisma.categoria.findFirst.mockResolvedValue(null);
    await expect(controller.crear(sesion, { nombre: 'Linternas', categoriaPadreId: padre })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.categoria.create).not.toHaveBeenCalled();
  });

  it('impide convertir un descendiente en padre de su propio antecesor', async () => {
    prisma.categoria.findFirst.mockResolvedValueOnce({ id: padre }).mockResolvedValueOnce({ activa: true, categoriaPadreId: padre });
    await expect(controller.editar(sesion, padre, { categoriaPadreId: hijo })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.categoria.update).not.toHaveBeenCalled();
  });

  it('impide desactivar un padre con subcategorías activas', async () => {
    prisma.categoria.findFirst.mockResolvedValue({ id: padre });
    prisma.categoria.count.mockResolvedValue(1);
    await expect(controller.editar(sesion, padre, { activa: false })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.categoria.update).not.toHaveBeenCalled();
  });
});
