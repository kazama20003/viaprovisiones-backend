ALTER TABLE "sucursales" ADD COLUMN "tipo" VARCHAR(30) NOT NULL DEFAULT 'sin_definir', ADD COLUMN "latitud" DOUBLE PRECISION, ADD COLUMN "longitud" DOUBLE PRECISION;
ALTER TABLE "almacenes" ADD COLUMN "latitud" DOUBLE PRECISION, ADD COLUMN "longitud" DOUBLE PRECISION;
ALTER TABLE "sucursales" ADD CONSTRAINT "sucursales_coordenadas_validas" CHECK (("latitud" IS NULL AND "longitud" IS NULL) OR ("latitud" IS NOT NULL AND "longitud" IS NOT NULL AND "latitud" BETWEEN -90 AND 90 AND "longitud" BETWEEN -180 AND 180));
ALTER TABLE "almacenes" ADD CONSTRAINT "almacenes_coordenadas_validas" CHECK (("latitud" IS NULL AND "longitud" IS NULL) OR ("latitud" IS NOT NULL AND "longitud" IS NOT NULL AND "latitud" BETWEEN -90 AND 90 AND "longitud" BETWEEN -180 AND 180));
ALTER TABLE "sucursales" ADD CONSTRAINT "sucursales_tipo_valido" CHECK ("tipo" IN ('sin_definir','tienda','almacen','oficina','centro_distribucion','punto_recojo','mixta','otro'));
