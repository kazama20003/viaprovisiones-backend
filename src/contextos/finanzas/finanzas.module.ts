import { Module } from '@nestjs/common';
import { AccesoModule } from '../acceso/acceso.module';
import { CuentasClienteController } from './cuentas-cliente.controller';
import { GastosController } from './gastos.controller';
import { CuentasProveedorController } from './cuentas-proveedor.controller';
@Module({imports:[AccesoModule],controllers:[CuentasProveedorController,GastosController,CuentasClienteController]})
export class FinanzasModule {}
