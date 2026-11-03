CREATE TABLE "conteos_inventario" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "empresa_id" UUID NOT NULL REFERENCES "empresas"("id"),
 "lote_id" UUID NOT NULL REFERENCES "lotes"("id"),
 "almacen_id" UUID NOT NULL REFERENCES "almacenes"("id"),
 "usuario_id" UUID NOT NULL REFERENCES "usuarios"("id"),
 "stock_anterior" DECIMAL(14,3) NOT NULL,
 "stock_reservado" DECIMAL(14,3) NOT NULL,
 "stock_contado" DECIMAL(14,3) NOT NULL,
 "diferencia" DECIMAL(14,3) NOT NULL,
 "motivo" VARCHAR(250),
 "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "conteos_inventario_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "conteos_inventario_empresa_id_creado_en_idx" ON "conteos_inventario"("empresa_id", "creado_en");
