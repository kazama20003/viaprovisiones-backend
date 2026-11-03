import { Module } from '@nestjs/common';
import { AccesoModule } from '../acceso/acceso.module';
import { ComprasController } from './compras.controller';
@Module({imports:[AccesoModule],controllers:[ComprasController]})
export class AbastecimientoModule {}
