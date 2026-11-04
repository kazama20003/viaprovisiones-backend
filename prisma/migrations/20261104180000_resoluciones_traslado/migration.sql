CREATE TABLE "resoluciones_diferencia_traslado" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "empresa_id" UUID NOT NULL REFERENCES "empresas"("id"),
 "linea_traslado_id" UUID NOT NULL REFERENCES "lineas_traslado"("id"),
 "usuario_id" UUID NOT NULL REFERENCES "usuarios"("id"),
 "movimiento_id" UUID REFERENCES "movimientos_inventario"("id"),
 "clave_idempotencia" UUID NOT NULL,
 "tipo" VARCHAR(20) NOT NULL CHECK ("tipo" IN ('destino','origen','perdida','dano')),
 "cantidad" DECIMAL(14,3) NOT NULL CHECK ("cantidad" > 0),
 "motivo" VARCHAR(250) NOT NULL,
 "creada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "resoluciones_diferencia_traslado_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "resoluciones_diferencia_traslado_movimiento_id_key" ON "resoluciones_diferencia_traslado"("movimiento_id");
CREATE UNIQUE INDEX "resoluciones_diferencia_traslado_empresa_id_clave_idempotencia_key" ON "resoluciones_diferencia_traslado"("empresa_id", "clave_idempotencia");
CREATE INDEX "resoluciones_diferencia_traslado_empresa_id_linea_traslado_id_idx" ON "resoluciones_diferencia_traslado"("empresa_id", "linea_traslado_id");
