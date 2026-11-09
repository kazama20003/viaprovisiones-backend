CREATE TABLE "contadores_ubicacion" (
  "empresa_id" UUID NOT NULL REFERENCES "empresas"("id") ON DELETE CASCADE,
  "tipo" VARCHAR(12) NOT NULL CHECK ("tipo" IN ('ubicacion','sucursal')),
  "ultimo_numero" BIGINT NOT NULL DEFAULT 0 CHECK ("ultimo_numero" >= 0),
  PRIMARY KEY ("empresa_id", "tipo")
);
INSERT INTO "contadores_ubicacion" ("empresa_id", "tipo", "ultimo_numero")
SELECT "empresa_id", 'ubicacion', COALESCE(MAX(SUBSTRING(UPPER("codigo") FROM '^UBI-([0-9]{1,12})$')::bigint), 0) FROM "almacenes" GROUP BY "empresa_id";
INSERT INTO "contadores_ubicacion" ("empresa_id", "tipo", "ultimo_numero")
SELECT "empresa_id", 'sucursal', COALESCE(MAX(SUBSTRING(UPPER("codigo") FROM '^SUC-([0-9]{1,12})$')::bigint), 0) FROM "sucursales" GROUP BY "empresa_id";
