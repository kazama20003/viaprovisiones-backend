import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ArchivosController } from './archivos.controller';
import type { PrismaService } from '../../../compartido/infraestructura/prisma/prisma.service';
import type { AutenticacionService } from '../../acceso/autenticacion.service';

jest.mock('../../../compartido/infraestructura/prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../../acceso/autenticacion.service', () => ({ AutenticacionService: class {} }));

describe('archivos de producto', () => {
  const sesion = { sesionId: 's', empresaId: 'e', usuarioId: 'u', roles: [], permisos: [] };
  const prisma = { producto: { findFirst: jest.fn().mockResolvedValue({ id: 'p', nombre: 'Producto' }) }, archivoProducto: { count: jest.fn().mockResolvedValue(0) } };
  const controller = new ArchivosController(prisma as unknown as PrismaService, {} as AutenticacionService);
  const png = Buffer.from([137,80,78,71,13,10,26,10]);

  beforeEach(() => { delete process.env.GCS_BUCKET; prisma.archivoProducto.count.mockResolvedValue(0); });

  it('rechaza archivos que no corresponden al formato declarado', async () => {
    await expect(controller.subir('p', sesion, { buffer: Buffer.from('texto'), mimetype: 'image/png', size: 5 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('indica si falta configurar el bucket antes de subir', async () => {
    await expect(controller.subir('p', sesion, { buffer: png, mimetype: 'image/png', size: png.length })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('aplica el límite de imágenes antes de conectar al almacenamiento', async () => {
    prisma.archivoProducto.count.mockResolvedValue(8);
    await expect(controller.subir('p', sesion, { buffer: png, mimetype: 'image/png', size: png.length })).rejects.toThrow('hasta 8 imágenes');
  });
});
