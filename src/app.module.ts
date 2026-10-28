import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AbastecimientoModule } from './contextos/abastecimiento/abastecimiento.module';
import { AccesoModule } from './contextos/acceso/acceso.module';
import { CatalogoModule } from './contextos/catalogo/catalogo.module';
import { ClientesModule } from './contextos/clientes/clientes.module';
import { FinanzasModule } from './contextos/finanzas/finanzas.module';
import { InventarioModule } from './contextos/inventario/inventario.module';
import { ProveedoresModule } from './contextos/proveedores/proveedores.module';
import { TiendaModule } from './contextos/tienda/tienda.module';
import { VentasModule } from './contextos/ventas/ventas.module';
import { PrismaModule } from './compartido/infraestructura/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AccesoModule,
    CatalogoModule,
    ClientesModule,
    ProveedoresModule,
    VentasModule,
    InventarioModule,
    AbastecimientoModule,
    FinanzasModule,
    TiendaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
