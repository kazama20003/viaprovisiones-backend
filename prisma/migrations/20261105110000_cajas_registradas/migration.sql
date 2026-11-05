CREATE TABLE "cajas_registradas" (
 "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "empresa_id" UUID NOT NULL REFERENCES "empresas"("id"), "almacen_id" UUID NOT NULL REFERENCES "almacenes"("id"), "nombre" VARCHAR(80) NOT NULL, "activa" BOOLEAN NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX "cajas_registradas_id_empresa_id_key" ON "cajas_registradas" ("id", "empresa_id");
CREATE UNIQUE INDEX "cajas_registradas_nombre_unique" ON "cajas_registradas" ("empresa_id", "almacen_id", lower("nombre"));
INSERT INTO "cajas_registradas" ("empresa_id", "almacen_id", "nombre") SELECT DISTINCT ON ("empresa_id", "almacen_id", lower("nombre_caja")) "empresa_id", "almacen_id", "nombre_caja" FROM "sesiones_caja" ORDER BY "empresa_id", "almacen_id", lower("nombre_caja"), "abierta_en" DESC;
ALTER TABLE "sesiones_caja" ADD COLUMN "caja_registrada_id" UUID;
UPDATE "sesiones_caja" s SET "caja_registrada_id"=c."id" FROM "cajas_registradas" c WHERE c."empresa_id"=s."empresa_id" AND c."almacen_id"=s."almacen_id" AND lower(c."nombre")=lower(s."nombre_caja");
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_caja_registrada_id_fkey" FOREIGN KEY ("caja_registrada_id") REFERENCES "cajas_registradas"("id") ON DELETE RESTRICT;
