import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AutenticacionService } from './autenticacion.service';

export type ContextoAutenticado = {
  sesionId: string;
  empresaId: string;
  usuarioId: string;
  roles: string[];
  permisos: string[];
};

type SolicitudAutenticada = Request & {
  headers: Headers & { cookie?: string; authorization?: string; origin?: string };
  method: string;
  auth?: ContextoAutenticado;
};

function leerToken(request: SolicitudAutenticada) {
  const autorizado = request.headers.authorization;
  if (autorizado?.startsWith('Bearer ')) return autorizado.slice(7);
  const cookie = request.headers.cookie
    ?.split(';')
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith('via_sesion='));
  return cookie ? decodeURIComponent(cookie.slice('via_sesion='.length)) : null;
}

@Injectable()
export class SesionGuard implements CanActivate {
  constructor(private readonly autenticacion: AutenticacionService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<SolicitudAutenticada>();
    const origen = request.headers.origin;
    const origenPermitido = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    if (origen && origen !== origenPermitido) {
      throw new ForbiddenException('El origen de la solicitud no está permitido.');
    }

    const token = leerToken(request);
    if (!token) throw new UnauthorizedException('Inicia sesión para continuar.');
    const sesion = await this.autenticacion.verificarSesion(token);
    if (!sesion) throw new UnauthorizedException('La sesión venció o fue cerrada.');
    request.auth = sesion;
    return true;
  }
}

const CLAVE_PERMISOS = 'permisos_requeridos';

export const RequierePermisos = (...permisos: string[]) => SetMetadata(CLAVE_PERMISOS, permisos);

@Injectable()
export class PermisoGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requeridos = this.reflector.getAllAndOverride<string[]>(CLAVE_PERMISOS, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requeridos?.length) return true;
    const request = context.switchToHttp().getRequest<SolicitudAutenticada>();
    const permisos = request.auth?.permisos ?? [];
    if (!requeridos.every((permiso) => permisos.includes(permiso))) {
      throw new ForbiddenException('Tu rol no tiene permiso para realizar esta operación.');
    }
    return true;
  }
}

export function contextoDe(request: SolicitudAutenticada): ContextoAutenticado {
  if (!request.auth) throw new UnauthorizedException();
  return request.auth;
}

export const SesionActual = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ContextoAutenticado => {
    const request = context.switchToHttp().getRequest<SolicitudAutenticada>();
    return contextoDe(request);
  },
);

export function obtenerToken(request: SolicitudAutenticada) {
  return leerToken(request);
}
