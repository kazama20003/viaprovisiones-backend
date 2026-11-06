import { Module } from '@nestjs/common';
import { AccesoModule } from '../acceso/acceso.module';
import { MostradorController } from './presentacion/mostrador.controller';
import { PedidosController } from './presentacion/pedidos.controller';
import { CotizacionesController } from './presentacion/cotizaciones.controller';
import { ResumenPanelController } from './presentacion/resumen-panel.controller';

@Module({ imports: [AccesoModule], controllers: [PedidosController, CotizacionesController, ResumenPanelController, MostradorController] })
export class VentasModule {}
