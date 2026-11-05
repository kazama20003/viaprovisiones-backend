ALTER TABLE "sesiones_caja" ADD COLUMN "nombre_caja" VARCHAR(80) NOT NULL DEFAULT 'Caja principal';
CREATE UNIQUE INDEX "sesiones_caja_abierta_nombre_unique" ON "sesiones_caja" ("empresa_id", "almacen_id", lower("nombre_caja")) WHERE "estado" = 'abierta';
ALTER TABLE "devoluciones" ADD COLUMN "clave_operacion" UUID, ADD COLUMN "hash_operacion" VARCHAR(64);
CREATE UNIQUE INDEX "devoluciones_empresa_id_clave_operacion_key" ON "devoluciones" ("empresa_id", "clave_operacion");

ALTER TABLE "movimientos_caja" ADD COLUMN "clave_operacion" UUID;
CREATE UNIQUE INDEX "movimientos_caja_empresa_id_clave_operacion_key" ON "movimientos_caja" ("empresa_id", "clave_operacion");
