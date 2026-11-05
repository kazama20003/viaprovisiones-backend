import { Module } from '@nestjs/common';
import { AccesoModule } from '../acceso/acceso.module';
import { GastosController } from './gastos.controller';
import { CuentasProveedorController } from './cuentas-proveedor.controller';
@Module({imports:[AccesoModule],controllers:[CuentasProveedorController,GastosController]})
export class FinanzasModule {}
