CREATE TABLE "contadores_sku" (
  "empresa_id" UUID PRIMARY KEY REFERENCES "empresas"("id") ON DELETE CASCADE,
  "ultimo_numero" BIGINT NOT NULL DEFAULT 0 CHECK ("ultimo_numero" >= 0)
);
INSERT INTO "contadores_sku" ("empresa_id", "ultimo_numero")
SELECT "empresa_id", COALESCE(MAX(SUBSTRING("sku" FROM '^VIA-([0-9]{1,12})$')::bigint), 0)
FROM "productos" GROUP BY "empresa_id";
