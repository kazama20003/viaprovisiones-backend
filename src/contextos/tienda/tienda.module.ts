import { Module } from '@nestjs/common';
import { CatalogoTiendaController } from './presentacion/catalogo-tienda.controller';

@Module({ controllers: [CatalogoTiendaController] })
export class TiendaModule {}
