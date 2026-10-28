CREATE TABLE "marcas" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID NOT NULL,
  "nombre" VARCHAR(100) NOT NULL,
  "activa" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "marcas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "marcas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "marcas_empresa_id_nombre_key" ON "marcas"("empresa_id", "nombre");
INSERT INTO "marcas" ("empresa_id", "nombre")
SELECT DISTINCT "empresa_id", trim("marca") FROM "productos" WHERE "marca" IS NOT NULL AND trim("marca") <> ''
ON CONFLICT DO NOTHING;
