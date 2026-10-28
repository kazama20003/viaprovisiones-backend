import { Module } from '@nestjs/common';
import { AccesoModule } from '../acceso/acceso.module';
import { InventarioController } from './inventario.controller';

@Module({ imports: [AccesoModule], controllers: [InventarioController] })
export class InventarioModule {}
