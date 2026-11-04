import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ArchivosController } from './archivos.controller';
import type { PrismaService } from '../../../compartido/infraestructura/prisma/prisma.service';
import type { AutenticacionService } from '../../acceso/autenticacion.service';
import { PassThrough, Readable } from 'node:stream';
import { once } from 'node:events';

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

  it('transmite un rango de video con el tamaño y los encabezados correctos', async () => {
    const bytes = Buffer.from('0123456789');
    const requestCloud = jest.fn().mockResolvedValue({status:206,data:Readable.from([bytes.subarray(2,6)])});
    const db = {archivoProducto:{findUnique:jest.fn().mockResolvedValue({empresaId:'empresa',objeto:'privado/video',tamano:bytes.length,mime:'video/mp4',producto:{estado:'publicado',visibleEnTienda:true}})}};
    const instance = new ArchivosController(db as unknown as PrismaService, {} as AutenticacionService);
    (instance as any).bucket = () => ({name:'bucket',storage:{authClient:{getClient:async()=>({request:requestCloud})}}});
    const oldEmpresa=process.env.EMPRESA_ID; process.env.EMPRESA_ID='empresa';
    const response:any=new PassThrough(); response.status=jest.fn().mockReturnValue(response); response.set=jest.fn().mockReturnValue(response);
    const data:Buffer[]=[]; response.on('data',(chunk:Buffer)=>data.push(chunk));
    try {
      const finished=once(response,'finish');
      await instance.ver('archivo',{headers:{range:'bytes=2-5'}} as any,response);
      await finished;
      expect(Buffer.concat(data).toString()).toBe('2345');
      expect(response.status).toHaveBeenCalledWith(206);
      expect(response.set).toHaveBeenCalledWith('Content-Range','bytes 2-5/10');
      expect(response.set).toHaveBeenCalledWith(expect.objectContaining({'Content-Length':'4'}));
      expect(requestCloud).toHaveBeenCalledWith(expect.objectContaining({responseType:'stream',retry:false,headers:{Range:'bytes=2-5'}}));
    } finally { if(oldEmpresa===undefined) delete process.env.EMPRESA_ID; else process.env.EMPRESA_ID=oldEmpresa; }
  });
});
