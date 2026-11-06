ALTER TABLE "cuentas_por_cobrar" ADD COLUMN "almacen_id" UUID REFERENCES "almacenes"("id");
ALTER TABLE "cobros" ADD COLUMN "clave_operacion" UUID;
CREATE UNIQUE INDEX "cobros_empresa_id_clave_operacion_key" ON "cobros"("empresa_id", "clave_operacion");
ALTER TABLE "cuentas_por_cobrar" ADD COLUMN "sesion_caja_venta_id" UUID REFERENCES "sesiones_caja"("id");
