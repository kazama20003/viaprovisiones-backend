import { BadRequestException, Controller, Get, Logger, NotFoundException, Param, Post, Req, Res, ServiceUnavailableException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from '../../../compartido/infraestructura/prisma/prisma.service';
import { AutenticacionService } from '../../acceso/autenticacion.service';
import { PermisoGuard, RequierePermisos, SesionActual, SesionGuard } from '../../acceso/sesion.guard';
import type { ContextoAutenticado } from '../../acceso/sesion.guard';

type ArchivoSubido = { buffer: Buffer; mimetype: string; size: number };

@Controller()
export class ArchivosController {
  private readonly logger = new Logger(ArchivosController.name);
  constructor(private readonly prisma: PrismaService, private readonly auth: AutenticacionService) {}

  private bucket() {
    const nombre = process.env.GCS_BUCKET?.trim();
    if (!nombre) throw new ServiceUnavailableException('Falta configurar GCS_BUCKET en el backend.');
    return new Storage({ projectId: process.env.GOOGLE_CLOUD_PROJECT || undefined }).bucket(nombre);
  }

  private tipoArchivo(file: ArchivoSubido): 'imagen' | 'video' {
    const bytes = file.buffer;
    const jpg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const webp = bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    const mp4 = bytes.length >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp';
    const webm = bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
    if ((file.mimetype === 'image/jpeg' && jpg) || (file.mimetype === 'image/png' && png) || (file.mimetype === 'image/webp' && webp)) {
      if (file.size > 10 * 1024 * 1024) throw new BadRequestException('Cada imagen debe pesar como máximo 10 MB.');
      return 'imagen';
    }
    if ((file.mimetype === 'video/mp4' && mp4) || (file.mimetype === 'video/webm' && webm)) return 'video';
    throw new BadRequestException('Usa imágenes JPG, PNG o WebP, o videos MP4 o WebM válidos.');
  }

  @Post('productos/:id/archivos')
  @UseGuards(SesionGuard, PermisoGuard)
  @RequierePermisos('catalogo.productos.editar')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 50 * 1024 * 1024, files: 1 } }))
  async subir(@Param('id') id: string, @SesionActual() sesion: ContextoAutenticado, @UploadedFile() archivo?: ArchivoSubido) {
    if (!archivo?.buffer?.length) throw new BadRequestException('Selecciona un archivo.');
    const tipo = this.tipoArchivo(archivo);
    const producto = await this.prisma.producto.findFirst({ where: { id, empresaId: sesion.empresaId }, select: { id: true, nombre: true } });
    if (!producto) throw new NotFoundException('No se encontró el producto.');
    const cantidad = await this.prisma.archivoProducto.count({ where: { productoId: id, empresaId: sesion.empresaId, tipo } });
    if (cantidad >= (tipo === 'imagen' ? 8 : 3)) throw new BadRequestException(tipo === 'imagen' ? 'El producto admite hasta 8 imágenes.' : 'El producto admite hasta 3 videos.');
    const archivoId = randomUUID();
    const carpeta = tipo === 'imagen' ? 'imagenes' : 'videos';
    const objeto = `empresas/${sesion.empresaId}/productos/${id}/${carpeta}/${archivoId}`;
    const bucket = this.bucket();
    try {
      // Enviar el buffer directamente evita el flujo de escritura de la biblioteca,
      // que puede ocultar el error original con ERR_STREAM_DESTROYED.
      const client = await bucket.storage.authClient.getClient();
      await client.request({
        url: `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket.name)}/o`,
        method: 'POST',
        params: { uploadType: 'media', name: objeto, ifGenerationMatch: 0 },
        headers: { 'Content-Type': archivo.mimetype },
        data: archivo.buffer,
      });
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'desconocido';
      const status = typeof error === 'object' && error !== null && 'response' in error && typeof error.response === 'object' && error.response !== null && 'status' in error.response ? String(error.response.status) : '';
      this.logger.error(`Error al subir archivo a Cloud Storage (código: ${code}${status ? `, HTTP: ${status}` : ''}).`);
      throw new ServiceUnavailableException('No se pudo subir el archivo a Google Cloud Storage. Revisa el bucket y las credenciales del servidor.');
    }
    const url = `/api/v1/archivos/${archivoId}`;
    try {
      await this.prisma.$transaction(async tx => {
        const total = await tx.archivoProducto.count({ where: { productoId: id, empresaId: sesion.empresaId, tipo } });
        if (total >= (tipo === 'imagen' ? 8 : 3)) throw new BadRequestException(tipo === 'imagen' ? 'El producto admite hasta 8 imágenes.' : 'El producto admite hasta 3 videos.');
        await tx.archivoProducto.create({ data: { id: archivoId, productoId: id, empresaId: sesion.empresaId, objeto, tipo, mime: archivo.mimetype, tamano: archivo.size } });
        if (tipo === 'imagen') {
          const ultima = await tx.imagenProducto.aggregate({ where: { productoId: id }, _max: { posicion: true }, _count: true });
          await tx.imagenProducto.create({ data: { productoId: id, url, textoAlternativo: producto.nombre, posicion: (ultima._max.posicion ?? -1) + 1, esPrincipal: ultima._count === 0 } });
        }
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      await bucket.file(objeto).delete({ ignoreNotFound: true }).catch(() => undefined);
      throw error;
    }
    return { datos: { id: archivoId, tipo, url } };
  }

  @Post('productos/:productoId/archivos/:id/principal')
  @UseGuards(SesionGuard, PermisoGuard)
  @RequierePermisos('catalogo.productos.editar')
  async principal(@Param('productoId') productoId: string, @Param('id') id: string, @SesionActual() sesion: ContextoAutenticado) {
    const archivo = await this.prisma.archivoProducto.findFirst({ where: { id, productoId, empresaId: sesion.empresaId, tipo: 'imagen' } });
    if (!archivo) throw new NotFoundException('No se encontró la imagen.');
    const url = `/api/v1/archivos/${id}`;
    await this.prisma.$transaction(async tx => {
      const imagen = await tx.imagenProducto.findFirst({ where: { productoId, url } });
      if (!imagen) throw new NotFoundException('No se encontró la imagen.');
      await tx.imagenProducto.updateMany({ where: { productoId }, data: { esPrincipal: false } });
      await tx.imagenProducto.update({ where: { id: imagen.id }, data: { esPrincipal: true } });
    });
    return { datos: { id } };
  }

  @Get('archivos/:id')
  async ver(@Param('id') id: string, @Req() request: Request, @Res() response: Response) {
    const archivo = await this.prisma.archivoProducto.findUnique({ where: { id }, include: { producto: { select: { estado: true, visibleEnTienda: true } } } });
    if (!archivo) throw new NotFoundException('No se encontró el archivo.');
    const publico = archivo.empresaId === process.env.EMPRESA_ID && archivo.producto.estado === 'publicado' && archivo.producto.visibleEnTienda;
    if (!publico) {
      const cookie = request.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('via_sesion='));
      const token = cookie ? decodeURIComponent(cookie.slice('via_sesion='.length)) : '';
      const sesion = token ? await this.auth.verificarSesion(token) : null;
      if (!sesion || sesion.empresaId !== archivo.empresaId || !sesion.permisos.includes('catalogo.productos.leer')) throw new NotFoundException('No se encontró el archivo.');
    }
    const file = this.bucket().file(archivo.objeto);
    const range = request.headers.range;
    let start = 0, end = archivo.tamano - 1;
    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (!match || Number(match[1]) >= archivo.tamano) { response.status(416).set('Content-Range', `bytes */${archivo.tamano}`).end(); return; }
      start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), end) : end;
      if (end < start) { response.status(416).set('Content-Range', `bytes */${archivo.tamano}`).end(); return; }
      response.status(206).set('Content-Range', `bytes ${start}-${end}/${archivo.tamano}`);
    }
    response.set({ 'Content-Type': archivo.mime, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes', 'Cache-Control': publico ? 'public, max-age=300' : 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    const stream = file.createReadStream({ start, end });
    stream.on('error', () => { if (!response.headersSent) response.status(503).end(); else response.destroy(); });
    stream.pipe(response);
  }
}
