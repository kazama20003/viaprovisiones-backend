CREATE TABLE "devoluciones_proveedor" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "empresa_id" UUID NOT NULL REFERENCES "empresas"("id"),
 "detalle_recepcion_id" UUID NOT NULL REFERENCES "detalles_recepcion"("id"),
 "lote_id" UUID NOT NULL REFERENCES "lotes"("id"),
 "almacen_id" UUID NOT NULL REFERENCES "almacenes"("id"),
 "usuario_id" UUID NOT NULL REFERENCES "usuarios"("id"),
 "movimiento_id" UUID NOT NULL REFERENCES "movimientos_inventario"("id"),
 "numero" VARCHAR(30) NOT NULL,
 "cantidad" DECIMAL(14,3) NOT NULL CHECK ("cantidad" > 0),
 "motivo" VARCHAR(250) NOT NULL,
 "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "devoluciones_proveedor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "devoluciones_proveedor_movimiento_id_key" ON "devoluciones_proveedor"("movimiento_id");
CREATE UNIQUE INDEX "devoluciones_proveedor_empresa_id_numero_key" ON "devoluciones_proveedor"("empresa_id", "numero");
CREATE INDEX "devoluciones_proveedor_empresa_id_detalle_recepcion_id_idx" ON "devoluciones_proveedor"("empresa_id", "detalle_recepcion_id");
