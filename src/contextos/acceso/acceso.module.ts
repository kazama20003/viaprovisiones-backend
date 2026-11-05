import { Module } from '@nestjs/common';
import { AdministracionController } from './administracion.controller';
import { AutenticacionController } from './autenticacion.controller';
import { AutenticacionService } from './autenticacion.service';
import { PermisoGuard, SesionGuard } from './sesion.guard';

@Module({
  controllers: [AutenticacionController, AdministracionController],
  providers: [AutenticacionService, SesionGuard, PermisoGuard],
  exports: [AutenticacionService, SesionGuard, PermisoGuard],
})
export class AccesoModule {}
