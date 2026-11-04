ALTER TABLE "pagos_proveedores" ADD COLUMN "clave_idempotencia" UUID;
CREATE UNIQUE INDEX "pagos_proveedores_empresa_id_clave_idempotencia_key" ON "pagos_proveedores"("empresa_id", "clave_idempotencia");
CREATE TABLE "notas_credito_proveedor" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "empresa_id" UUID NOT NULL REFERENCES "empresas"("id"),
 "cuenta_por_pagar_id" UUID NOT NULL REFERENCES "cuentas_por_pagar"("id"),
 "devolucion_proveedor_id" UUID NOT NULL REFERENCES "devoluciones_proveedor"("id"),
 "proveedor_id" UUID NOT NULL REFERENCES "proveedores"("id"),
 "usuario_id" UUID NOT NULL REFERENCES "usuarios"("id"),
 "numero" VARCHAR(80) NOT NULL,
 "fecha_emision" DATE NOT NULL,
 "monto" DECIMAL(14,2) NOT NULL CHECK ("monto" > 0),
 "clave_idempotencia" UUID NOT NULL,
 "creada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "notas_credito_proveedor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notas_credito_proveedor_empresa_id_proveedor_id_numero_key" ON "notas_credito_proveedor"("empresa_id", "proveedor_id", "numero");
CREATE UNIQUE INDEX "notas_credito_proveedor_empresa_id_clave_idempotencia_key" ON "notas_credito_proveedor"("empresa_id", "clave_idempotencia");
CREATE INDEX "notas_credito_proveedor_empresa_id_cuenta_por_pagar_id_idx" ON "notas_credito_proveedor"("empresa_id", "cuenta_por_pagar_id");
