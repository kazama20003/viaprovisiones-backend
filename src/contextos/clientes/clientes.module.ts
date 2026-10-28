import { Module } from '@nestjs/common';
import { AccesoModule } from '../acceso/acceso.module';
import { ClientesController } from './presentacion/clientes.controller';

@Module({ imports: [AccesoModule], controllers: [ClientesController] })
export class ClientesModule {}
