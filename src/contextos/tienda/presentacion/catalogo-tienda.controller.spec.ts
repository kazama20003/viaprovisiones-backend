import { CatalogoTiendaController } from './catalogo-tienda.controller';
import type { PrismaService } from '../../../compartido/infraestructura/prisma/prisma.service';

jest.mock('../../../compartido/infraestructura/prisma/prisma.service', () => ({ PrismaService: class {} }));

it('incluye productos de los descendientes al filtrar una categoría superior', async () => {
  const previous = process.env.EMPRESA_ID;
  process.env.EMPRESA_ID = '11111111-1111-4111-8111-111111111111';
  const prisma = {
    categoria: { findMany: jest.fn().mockResolvedValue([
      { id: 'a', nombre: 'Iluminación', categoriaPadreId: null },
      { id: 'b', nombre: 'Linternas', categoriaPadreId: 'a' },
      { id: 'c', nombre: 'Recargables', categoriaPadreId: 'b' },
      { id: 'd', nombre: 'Otros', categoriaPadreId: null },
    ]) },
    producto: { findMany: jest.fn().mockResolvedValue([]) },
  };
  try {
    await new CatalogoTiendaController(prisma as unknown as PrismaService).listar(undefined, 'Iluminación');
    expect(prisma.producto.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ categoriaId: { in: ['a', 'b', 'c'] } }) }));
  } finally { if (previous === undefined) delete process.env.EMPRESA_ID; else process.env.EMPRESA_ID = previous; }
});
