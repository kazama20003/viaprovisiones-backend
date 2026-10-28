import { Module } from '@nestjs/common';
import { AccesoModule } from '../acceso/acceso.module';
import { ProductosController } from './presentacion/productos.controller';
import { ArchivosController } from './presentacion/archivos.controller';
import { CategoriasController } from './presentacion/categorias.controller';

@Module({ imports: [AccesoModule], controllers: [ProductosController, ArchivosController, CategoriasController] })
export class CatalogoModule {}
