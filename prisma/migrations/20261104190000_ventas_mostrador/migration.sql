ALTER TABLE "pedidos" ADD COLUMN "clave_venta" UUID;
ALTER TABLE "pedidos" ADD COLUMN "hash_venta" VARCHAR(64);
CREATE UNIQUE INDEX "pedidos_empresa_id_clave_venta_key" ON "pedidos"("empresa_id", "clave_venta");
