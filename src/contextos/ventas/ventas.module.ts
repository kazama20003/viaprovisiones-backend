import { Module } from '@nestjs/common';
import { AccesoModule } from '../acceso/acceso.module';
import { PedidosController } from './presentacion/pedidos.controller';
import { ResumenPanelController } from './presentacion/resumen-panel.controller';

@Module({ imports: [AccesoModule], controllers: [PedidosController, ResumenPanelController] })
export class VentasModule {}
