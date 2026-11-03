import { Module } from '@nestjs/common';
import { AccesoModule } from '../acceso/acceso.module';
import { InventarioController } from './inventario.controller';
import { UbicacionesController } from './ubicaciones.controller';
import { KardexController } from './kardex.controller';
import { TrasladosController } from './traslados.controller';

@Module({ imports: [AccesoModule], controllers: [InventarioController, UbicacionesController, TrasladosController, KardexController] })
export class InventarioModule {}
