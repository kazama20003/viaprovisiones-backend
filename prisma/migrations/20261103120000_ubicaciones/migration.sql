CREATE TABLE "sucursales" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID NOT NULL,
  "codigo" VARCHAR(30) NOT NULL,
  "nombre" VARCHAR(120) NOT NULL,
  "direccion" VARCHAR(250),
  "activa" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "sucursales_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sucursales_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "sucursales_empresa_id_codigo_key" ON "sucursales"("empresa_id", "codigo");
CREATE UNIQUE INDEX "sucursales_id_empresa_id_key" ON "sucursales"("id", "empresa_id");
ALTER TABLE "almacenes" ADD COLUMN "tipo" VARCHAR(20) NOT NULL DEFAULT 'almacen', ADD COLUMN "sucursal_id" UUID;
UPDATE "almacenes" SET "tipo" = 'tienda' WHERE "codigo" = 'TIENDA';
ALTER TABLE "almacenes" ADD CONSTRAINT "almacenes_sucursal_id_empresa_id_fkey" FOREIGN KEY ("sucursal_id", "empresa_id") REFERENCES "sucursales"("id", "empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;
