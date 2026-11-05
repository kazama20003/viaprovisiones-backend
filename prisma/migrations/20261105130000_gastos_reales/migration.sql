ALTER TABLE "gastos" ADD COLUMN "almacen_id" UUID REFERENCES "almacenes"("id"), ADD COLUMN "clave_operacion" UUID;
CREATE UNIQUE INDEX "gastos_empresa_id_clave_operacion_key" ON "gastos"("empresa_id", "clave_operacion");
