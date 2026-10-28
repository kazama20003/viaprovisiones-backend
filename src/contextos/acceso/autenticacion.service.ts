import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaService } from '../../compartido/infraestructura/prisma/prisma.service';

const scrypt = promisify(scryptCallback);
const DURACION_SESION_MS = 8 * 60 * 60 * 1000;
const DURACION_SESION_RECORDADA_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AutenticacionService {
  constructor(private readonly prisma: PrismaService) {}

  async iniciarSesion(correo: string, clave: string, recordarSesion = false) {
    const empresaId = process.env.EMPRESA_ID;
    if (!empresaId) {
      throw new ServiceUnavailableException('Falta configurar EMPRESA_ID en el backend.');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { empresaId_correo: { empresaId, correo: correo.trim().toLowerCase() } },
      include: {
        roles: {
          include: {
            rol: {
              select: {
                nombre: true,
                permisos: { include: { permiso: { select: { codigo: true } } } },
              },
            },
          },
        },
      },
    });

    if (!usuario?.activo || !(await this.verificarClave(clave, usuario.claveCifrada))) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const token = randomBytes(32).toString('base64url');
    const expiraEn = new Date(Date.now() + (recordarSesion ? DURACION_SESION_RECORDADA_MS : DURACION_SESION_MS));
    const hash = this.hashToken(token);
    const sesion = await this.prisma.sesionUsuario.create({
      data: { empresaId, usuarioId: usuario.id, tokenHash: hash, expiraEn },
      select: { id: true },
    });
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAccesoEn: new Date() },
    });

    return {
      token,
      sesionId: sesion.id,
      expiraEn,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        roles: usuario.roles.map(({ rol }) => rol.nombre),
        permisos: [...new Set(usuario.roles.flatMap(({ rol }) => rol.permisos.map(({ permiso }) => permiso.codigo)))],
      },
    };
  }

  async verificarSesion(token: string) {
    const sesion = await this.prisma.sesionUsuario.findFirst({
      where: {
        tokenHash: this.hashToken(token),
        revocadaEn: null,
        expiraEn: { gt: new Date() },
      },
      select: {
        id: true,
        empresaId: true,
        usuarioId: true,
        usuario: {
          select: {
            activo: true,
            roles: {
              include: {
                rol: {
                  select: {
                    nombre: true,
                    permisos: { include: { permiso: { select: { codigo: true } } } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!sesion || !sesion.usuario.activo) return null;
    return {
      sesionId: sesion.id,
      empresaId: sesion.empresaId,
      usuarioId: sesion.usuarioId,
      roles: sesion.usuario.roles.map(({ rol }) => rol.nombre),
      permisos: [...new Set(sesion.usuario.roles.flatMap(({ rol }) => rol.permisos.map(({ permiso }) => permiso.codigo)))],
    };
  }

  async cerrarSesion(sesionId: string) {
    await this.prisma.sesionUsuario.updateMany({
      where: { id: sesionId, revocadaEn: null },
      data: { revocadaEn: new Date() },
    });
  }

  async revocarToken(token: string) {
    await this.prisma.sesionUsuario.updateMany({
      where: { tokenHash: this.hashToken(token), revocadaEn: null },
      data: { revocadaEn: new Date() },
    });
  }

  async usuarioActual(usuarioId: string, empresaId: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId, activo: true },
      include: {
        roles: {
          include: {
            rol: {
              select: {
                nombre: true,
                permisos: { include: { permiso: { select: { codigo: true } } } },
              },
            },
          },
        },
      },
    });
    if (!usuario) throw new UnauthorizedException('La sesión ya no es válida.');
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      roles: usuario.roles.map(({ rol }) => rol.nombre),
      permisos: [...new Set(usuario.roles.flatMap(({ rol }) => rol.permisos.map(({ permiso }) => permiso.codigo)))],
    };
  }

  hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async verificarClave(entrada: string, almacenada: string) {
    const [version, saltHex, hashHex] = almacenada.split('$');
    if (version !== 'scrypt' || !saltHex || !hashHex || !/^[a-f\d]+$/i.test(saltHex + hashHex)) {
      return false;
    }
    const hashEsperado = Buffer.from(hashHex, 'hex');
    const hashCalculado = (await scrypt(entrada, Buffer.from(saltHex, 'hex'), hashEsperado.length)) as Buffer;
    return hashEsperado.length === hashCalculado.length && timingSafeEqual(hashEsperado, hashCalculado);
  }
}

export async function crearHashClave(clave: string) {
  const salt = randomBytes(16);
  const hash = (await scrypt(clave, salt, 64)) as Buffer;
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
