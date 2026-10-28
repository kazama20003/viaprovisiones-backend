ALTER TABLE "productos" ADD COLUMN "datos_adicionales" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "historial_productos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "producto_id" UUID NOT NULL,
  "empresa_id" UUID NOT NULL,
  "usuario_id" UUID NOT NULL,
  "accion" VARCHAR(80) NOT NULL,
  "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "historial_productos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "historial_productos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "historial_productos_producto_id_creado_en_idx" ON "historial_productos" ("producto_id", "creado_en" DESC);
