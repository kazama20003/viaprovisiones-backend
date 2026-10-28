CREATE TABLE "archivos_productos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "producto_id" UUID NOT NULL,
  "empresa_id" UUID NOT NULL,
  "objeto" TEXT NOT NULL,
  "tipo" VARCHAR(10) NOT NULL,
  "mime" VARCHAR(80) NOT NULL,
  "tamano" INTEGER NOT NULL,
  "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "archivos_productos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "archivos_productos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "archivos_productos_objeto_key" ON "archivos_productos"("objeto");
CREATE INDEX "archivos_productos_producto_id_creado_en_idx" ON "archivos_productos"("producto_id", "creado_en");
