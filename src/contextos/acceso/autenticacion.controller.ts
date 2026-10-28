import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  ForbiddenException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AutenticacionService } from './autenticacion.service';
import { contextoDe, obtenerToken, SesionGuard } from './sesion.guard';

@Controller('sesion')
export class AutenticacionController {
  constructor(private readonly autenticacion: AutenticacionService) {}

  @Post('iniciar')
  async iniciar(
    @Body() cuerpo: { correo?: unknown; clave?: unknown; recordarSesion?: unknown },
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    if (
      typeof cuerpo.correo !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cuerpo.correo.trim()) ||
      typeof cuerpo.clave !== 'string' ||
      cuerpo.clave.length < 1
    ) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }
    const recordarSesion = cuerpo.recordarSesion === true;
    const sesion = await this.autenticacion.iniciarSesion(cuerpo.correo, cuerpo.clave, recordarSesion);
    const seguro = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const maxAge = Math.floor((sesion.expiraEn.getTime() - Date.now()) / 1000);
    respuesta.setHeader(
      'Set-Cookie',
      `via_sesion=${encodeURIComponent(sesion.token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${seguro}`,
    );
    return { datos: { ...sesion.usuario, expiraEn: sesion.expiraEn } };
  }

  @Get('actual')
  @UseGuards(SesionGuard)
  async actual(@Req() solicitud: Request & { auth?: { usuarioId: string; empresaId: string } }) {
    const auth = contextoDe(solicitud as never);
    return { datos: await this.autenticacion.usuarioActual(auth.usuarioId, auth.empresaId) };
  }

  @Post('cerrar')
  async cerrar(
    @Req() solicitud: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    const origen = solicitud.headers.origin;
    if (origen && origen !== (process.env.FRONTEND_URL ?? 'http://localhost:3001')) {
      throw new ForbiddenException('El origen de la solicitud no está permitido.');
    }
    const token = obtenerToken(solicitud as never);
    if (token) await this.autenticacion.revocarToken(token);
    const seguro = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    respuesta.setHeader('Set-Cookie', `via_sesion=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${seguro}`);
    return { datos: { cerrada: true } };
  }
}
