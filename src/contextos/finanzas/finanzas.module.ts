import { Module } from '@nestjs/common';
import { AccesoModule } from '../acceso/acceso.module';
import { CuentasProveedorController } from './cuentas-proveedor.controller';
@Module({imports:[AccesoModule],controllers:[CuentasProveedorController]})
export class FinanzasModule {}
