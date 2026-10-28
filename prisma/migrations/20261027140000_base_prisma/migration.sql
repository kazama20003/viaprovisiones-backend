-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('dni', 'ruc', 'ce', 'sin_documento');

-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('consumidor', 'minorista', 'mayorista', 'empresa');

-- CreateEnum
CREATE TYPE "EstadoProducto" AS ENUM ('borrador', 'publicado', 'oculto', 'descontinuado');

-- CreateEnum
CREATE TYPE "EstadoCompra" AS ENUM ('borrador', 'enviada', 'en_transito', 'recepcion_parcial', 'recibida', 'cancelada');

-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('borrador', 'enviada', 'en_negociacion', 'aceptada', 'rechazada', 'vencida', 'convertida', 'cancelada');

-- CreateEnum
CREATE TYPE "CanalPedido" AS ENUM ('tienda_web', 'whatsapp', 'empresas', 'mostrador', 'otro');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('por_pagar', 'pagado', 'preparando', 'enviado', 'entregado', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('pendiente', 'parcial', 'pagado', 'reembolsado');

-- CreateEnum
CREATE TYPE "MetodoEntrega" AS ENUM ('delivery', 'agencia', 'recojo');

-- CreateEnum
CREATE TYPE "EstadoComprobante" AS ENUM ('pendiente', 'emitido', 'aceptado', 'rechazado', 'anulado');

-- CreateEnum
CREATE TYPE "EstadoCuenta" AS ENUM ('pendiente', 'parcial', 'pagada', 'vencida', 'anulada');

-- CreateEnum
CREATE TYPE "EstadoSesionCaja" AS ENUM ('abierta', 'cerrada');

-- CreateEnum
CREATE TYPE "TipoMovimientoCaja" AS ENUM ('apertura', 'cobro', 'gasto', 'retiro', 'ingreso', 'ajuste');

-- CreateEnum
CREATE TYPE "SentidoMovimiento" AS ENUM ('entrada', 'salida');

-- CreateEnum
CREATE TYPE "TipoMovimientoInventario" AS ENUM ('recepcion', 'venta', 'reserva', 'liberacion', 'devolucion', 'ajuste', 'traslado_salida', 'traslado_entrada', 'reversion');

-- CreateEnum
CREATE TYPE "EstadoLote" AS ENUM ('disponible', 'en_revision', 'bloqueado', 'agotado');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('activa', 'consumida', 'liberada');

-- CreateEnum
CREATE TYPE "EstadoTraslado" AS ENUM ('preparando', 'en_camino', 'recibido', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoDevolucion" AS ENUM ('solicitada', 'aprobada', 'rechazada', 'recibida', 'reembolsada');

-- CreateEnum
CREATE TYPE "EstadoEnvio" AS ENUM ('pendiente', 'preparado', 'despachado', 'en_transito', 'entregado', 'fallido', 'devuelto', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoReembolso" AS ENUM ('solicitado', 'aprobado', 'procesado', 'rechazado');

-- CreateEnum
CREATE TYPE "TipoMedioPago" AS ENUM ('efectivo', 'transferencia', 'tarjeta', 'billetera_digital', 'credito', 'otro');

-- CreateEnum
CREATE TYPE "EstadoProductoDevuelto" AS ENUM ('apto_para_venta', 'en_revision', 'desechado');

-- CreateEnum
CREATE TYPE "TipoDescuento" AS ENUM ('porcentaje', 'monto_fijo', 'precio_especial');

-- CreateTable
CREATE TABLE "empresas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ruc" VARCHAR(11),
    "razon_social" VARCHAR(180) NOT NULL,
    "nombre_comercial" VARCHAR(180) NOT NULL,
    "correo" VARCHAR(254),
    "telefono" VARCHAR(30),
    "direccion" VARCHAR(250),
    "moneda" CHAR(3) NOT NULL DEFAULT 'PEN',
    "tasa_igv" DECIMAL(5,4) NOT NULL DEFAULT 0.18,
    "creada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizada_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "correo" VARCHAR(254) NOT NULL,
    "clave_cifrada" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_acceso_en" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "descripcion" VARCHAR(250),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permisos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "codigo" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(250) NOT NULL,

    CONSTRAINT "permisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_roles" (
    "empresa_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "rol_id" UUID NOT NULL,

    CONSTRAINT "usuarios_roles_pkey" PRIMARY KEY ("usuario_id","rol_id")
);

-- CreateTable
CREATE TABLE "roles_permisos" (
    "rol_id" UUID NOT NULL,
    "permiso_id" UUID NOT NULL,

    CONSTRAINT "roles_permisos_pkey" PRIMARY KEY ("rol_id","permiso_id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "tipo_documento" "TipoDocumento" NOT NULL DEFAULT 'sin_documento',
    "numero_documento" VARCHAR(20),
    "tipo_cliente" "TipoCliente" NOT NULL DEFAULT 'consumidor',
    "nombre" VARCHAR(180) NOT NULL,
    "razon_social" VARCHAR(180),
    "correo" VARCHAR(254),
    "telefono" VARCHAR(30),
    "limite_credito" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "condicion_pago_dias" SMALLINT NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direcciones_clientes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cliente_id" UUID NOT NULL,
    "alias" VARCHAR(80),
    "direccion" VARCHAR(250) NOT NULL,
    "referencia" VARCHAR(250),
    "distrito" VARCHAR(100),
    "provincia" VARCHAR(100),
    "departamento" VARCHAR(100),
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "creada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direcciones_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "tipo_documento" "TipoDocumento" NOT NULL DEFAULT 'ruc',
    "numero_documento" VARCHAR(20),
    "nombre" VARCHAR(180) NOT NULL,
    "razon_social" VARCHAR(180),
    "correo" VARCHAR(254),
    "telefono" VARCHAR(30),
    "direccion" VARCHAR(250),
    "condicion_pago_dias" SMALLINT NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "categoria_padre_id" UUID,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" VARCHAR(300),
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "categoria_id" UUID,
    "sku" VARCHAR(60) NOT NULL,
    "codigo_barras" VARCHAR(80),
    "nombre" VARCHAR(180) NOT NULL,
    "descripcion" TEXT,
    "marca" VARCHAR(100),
    "unidad_medida" VARCHAR(20) NOT NULL DEFAULT 'unidad',
    "tasa_igv" DECIMAL(5,4) NOT NULL DEFAULT 0.18,
    "stock_minimo" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "estado" "EstadoProducto" NOT NULL DEFAULT 'borrador',
    "visible_en_tienda" BOOLEAN NOT NULL DEFAULT false,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "permite_delivery" BOOLEAN NOT NULL DEFAULT true,
    "permite_agencia" BOOLEAN NOT NULL DEFAULT true,
    "permite_recojo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variantes_producto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "sku" VARCHAR(60) NOT NULL,
    "codigo_barras" VARCHAR(80),
    "atributos" JSONB NOT NULL DEFAULT '{}',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variantes_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imagenes_productos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "producto_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "texto_alternativo" VARCHAR(180),
    "posicion" SMALLINT NOT NULL DEFAULT 0,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "imagenes_productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listas_precios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "tipo_cliente" "TipoCliente",
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "listas_precios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precios_productos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lista_precios_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "variante_id" UUID,
    "cantidad_minima" DECIMAL(14,3) NOT NULL DEFAULT 1,
    "precio_unitario" DECIMAL(14,4) NOT NULL,
    "vigente_desde" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigente_hasta" TIMESTAMPTZ(6),

    CONSTRAINT "precios_productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacenes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "direccion" VARCHAR(250),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "almacenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_compra" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "proveedor_id" UUID NOT NULL,
    "creada_por" UUID,
    "numero" VARCHAR(30) NOT NULL,
    "estado" "EstadoCompra" NOT NULL DEFAULT 'borrador',
    "moneda" CHAR(3) NOT NULL DEFAULT 'PEN',
    "condicion_pago" VARCHAR(120),
    "fecha_emision" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_entrega_prevista" DATE,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "impuesto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "creada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordenes_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineas_orden_compra" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orden_compra_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "variante_id" UUID,
    "cantidad_pedida" DECIMAL(14,3) NOT NULL,
    "cantidad_recibida" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "costo_unitario" DECIMAL(14,4) NOT NULL,
    "tasa_igv" DECIMAL(5,4) NOT NULL DEFAULT 0.18,

    CONSTRAINT "lineas_orden_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recepciones_compra" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "orden_compra_id" UUID NOT NULL,
    "recibida_por" UUID,
    "numero" VARCHAR(30) NOT NULL,
    "recibida_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,

    CONSTRAINT "recepciones_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_recepcion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "recepcion_id" UUID NOT NULL,
    "linea_orden_compra_id" UUID NOT NULL,
    "almacen_id" UUID NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "codigo_lote" VARCHAR(60) NOT NULL,
    "fecha_vencimiento" DATE,
    "garantia_hasta" DATE,
    "observaciones_calidad" TEXT,

    CONSTRAINT "detalles_recepcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "proveedor_id" UUID,
    "detalle_recepcion_id" UUID,
    "variante_id" UUID,
    "codigo" VARCHAR(60) NOT NULL,
    "fecha_ingreso" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" DATE,
    "garantia_hasta" DATE,
    "costo_unitario" DECIMAL(14,4) NOT NULL,
    "estado" "EstadoLote" NOT NULL DEFAULT 'disponible',
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "existencias_lotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "lote_id" UUID NOT NULL,
    "almacen_id" UUID NOT NULL,
    "cantidad_fisica" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "cantidad_reservada" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "existencias_lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizaciones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "creada_por" UUID,
    "numero" VARCHAR(30) NOT NULL,
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'borrador',
    "moneda" CHAR(3) NOT NULL DEFAULT 'PEN',
    "emitida_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vence_en" TIMESTAMPTZ(6) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "descuento" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "impuesto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "condiciones_pago" VARCHAR(180),
    "direccion_entrega" TEXT,
    "creada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cotizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineas_cotizacion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cotizacion_id" UUID NOT NULL,
    "producto_id" UUID,
    "variante_id" UUID,
    "sku" VARCHAR(60) NOT NULL,
    "descripcion" VARCHAR(250) NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "precio_unitario" DECIMAL(14,4) NOT NULL,
    "descuento" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tasa_igv" DECIMAL(5,4) NOT NULL DEFAULT 0.18,
    "total_linea" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "lineas_cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "cotizacion_id" UUID,
    "vendedor_id" UUID,
    "numero" VARCHAR(30) NOT NULL,
    "canal" "CanalPedido" NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'por_pagar',
    "estado_pago" "EstadoPago" NOT NULL DEFAULT 'pendiente',
    "moneda" CHAR(3) NOT NULL DEFAULT 'PEN',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "descuento" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "impuesto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "costo_envio" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "metodo_entrega" "MetodoEntrega",
    "direccion_entrega" TEXT,
    "nombre_receptor" VARCHAR(160),
    "telefono_receptor" VARCHAR(30),
    "documento_tipo" VARCHAR(15),
    "notas" TEXT,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineas_pedido" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pedido_id" UUID NOT NULL,
    "producto_id" UUID,
    "variante_id" UUID,
    "sku" VARCHAR(60) NOT NULL,
    "descripcion" VARCHAR(250) NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "precio_unitario" DECIMAL(14,4) NOT NULL,
    "descuento" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tasa_igv" DECIMAL(5,4) NOT NULL DEFAULT 0.18,
    "total_linea" DECIMAL(14,2) NOT NULL,
    "costo_unitario_historico" DECIMAL(14,4),

    CONSTRAINT "lineas_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comprobantes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "tipo" VARCHAR(15) NOT NULL,
    "serie" VARCHAR(10),
    "correlativo" VARCHAR(20),
    "estado" "EstadoComprobante" NOT NULL DEFAULT 'pendiente',
    "emitido_en" TIMESTAMPTZ(6),
    "codigo_externo" VARCHAR(100),
    "respuesta_externa" JSONB,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comprobantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas_por_cobrar" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "monto_original" DECIMAL(14,2) NOT NULL,
    "fecha_emision" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" DATE NOT NULL,
    "estado" "EstadoCuenta" NOT NULL DEFAULT 'pendiente',

    CONSTRAINT "cuentas_por_cobrar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas_por_pagar" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "orden_compra_id" UUID NOT NULL,
    "proveedor_id" UUID NOT NULL,
    "monto_original" DECIMAL(14,2) NOT NULL,
    "fecha_emision" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" DATE NOT NULL,
    "estado" "EstadoCuenta" NOT NULL DEFAULT 'pendiente',

    CONSTRAINT "cuentas_por_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_caja" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "almacen_id" UUID NOT NULL,
    "usuario_apertura_id" UUID NOT NULL,
    "usuario_cierre_id" UUID,
    "estado" "EstadoSesionCaja" NOT NULL DEFAULT 'abierta',
    "abierta_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerrada_en" TIMESTAMPTZ(6),
    "monto_apertura" DECIMAL(14,2) NOT NULL,
    "monto_esperado" DECIMAL(14,2),
    "monto_contado" DECIMAL(14,2),
    "diferencia" DECIMAL(14,2),
    "observaciones_cierre" TEXT,

    CONSTRAINT "sesiones_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "sesion_caja_id" UUID,
    "registrado_por" UUID NOT NULL,
    "concepto" VARCHAR(180) NOT NULL,
    "categoria" VARCHAR(100) NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "moneda" CHAR(3) NOT NULL DEFAULT 'PEN',
    "medio_pago" VARCHAR(30) NOT NULL,
    "medio_pago_id" UUID,
    "tipo_comprobante" VARCHAR(15) NOT NULL DEFAULT 'sin_comprobante',
    "fecha" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobros" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "cuenta_por_cobrar_id" UUID,
    "sesion_caja_id" UUID,
    "registrado_por" UUID NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "medio_pago" VARCHAR(30) NOT NULL,
    "medio_pago_id" UUID,
    "referencia" VARCHAR(120),
    "recibido_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cobros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_proveedores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "cuenta_por_pagar_id" UUID NOT NULL,
    "registrado_por" UUID NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "medio_pago" VARCHAR(30) NOT NULL,
    "medio_pago_id" UUID,
    "referencia" VARCHAR(120),
    "pagado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_caja" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "sesion_caja_id" UUID NOT NULL,
    "registrado_por" UUID NOT NULL,
    "tipo" "TipoMovimientoCaja" NOT NULL,
    "cobro_id" UUID,
    "gasto_id" UUID,
    "medio_pago" VARCHAR(30) NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "sentido" "SentidoMovimiento" NOT NULL,
    "descripcion" VARCHAR(250) NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "lote_id" UUID NOT NULL,
    "almacen_id" UUID NOT NULL,
    "tipo" "TipoMovimientoInventario" NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "sentido" "SentidoMovimiento" NOT NULL,
    "costo_unitario" DECIMAL(14,4),
    "pedido_id" UUID,
    "linea_pedido_id" UUID,
    "detalle_recepcion_id" UUID,
    "usuario_id" UUID,
    "movimiento_revertido_id" UUID,
    "traslado_id" UUID,
    "clave_idempotencia" VARCHAR(120),
    "motivo" VARCHAR(250),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas_inventario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "linea_pedido_id" UUID NOT NULL,
    "lote_id" UUID NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'activa',
    "clave_idempotencia" VARCHAR(120),
    "expira_en" TIMESTAMPTZ(6),
    "creada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizada_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reservas_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traslados" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "almacen_origen_id" UUID NOT NULL,
    "almacen_destino_id" UUID NOT NULL,
    "creado_por" UUID NOT NULL,
    "recibido_por" UUID,
    "numero" VARCHAR(30) NOT NULL,
    "estado" "EstadoTraslado" NOT NULL DEFAULT 'preparando',
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recibido_en" TIMESTAMPTZ(6),
    "observaciones" TEXT,

    CONSTRAINT "traslados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineas_traslado" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "traslado_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "lote_id" UUID NOT NULL,
    "cantidad_enviada" DECIMAL(14,3) NOT NULL,
    "cantidad_recibida" DECIMAL(14,3) NOT NULL DEFAULT 0,

    CONSTRAINT "lineas_traslado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devoluciones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "solicitado_por" UUID,
    "numero" VARCHAR(30) NOT NULL,
    "estado" "EstadoDevolucion" NOT NULL DEFAULT 'solicitada',
    "motivo" TEXT NOT NULL,
    "creada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devoluciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineas_devolucion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "devolucion_id" UUID NOT NULL,
    "linea_pedido_id" UUID NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "estado_producto" "EstadoProductoDevuelto" NOT NULL,
    "monto_reembolsado" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "lineas_devolucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promociones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "codigo" VARCHAR(40),
    "tipo_descuento" "TipoDescuento" NOT NULL,
    "valor" DECIMAL(14,4) NOT NULL,
    "compra_minima" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "usos_maximos" INTEGER,
    "usos_actuales" INTEGER NOT NULL DEFAULT 0,
    "vigente_desde" TIMESTAMPTZ(6) NOT NULL,
    "vigente_hasta" TIMESTAMPTZ(6),
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "promociones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promociones_productos" (
    "promocion_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,

    CONSTRAINT "promociones_productos_pkey" PRIMARY KEY ("promocion_id","producto_id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "titulo" VARCHAR(120) NOT NULL,
    "texto" TEXT,
    "texto_boton" VARCHAR(60),
    "enlace" VARCHAR(500),
    "imagen_url" TEXT,
    "color_texto" VARCHAR(7),
    "posicion" SMALLINT NOT NULL DEFAULT 0,
    "vigente_desde" TIMESTAMPTZ(6),
    "vigente_hasta" TIMESTAMPTZ(6),
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_estados_documentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "tipo_documento" VARCHAR(20) NOT NULL,
    "documento_id" UUID NOT NULL,
    "estado_anterior" VARCHAR(25),
    "estado_nuevo" VARCHAR(25) NOT NULL,
    "motivo" TEXT,
    "cambiado_por" UUID,
    "cambiado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_estados_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_auditoria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "usuario_id" UUID,
    "contexto" VARCHAR(40) NOT NULL,
    "entidad" VARCHAR(60) NOT NULL,
    "entidad_id" UUID NOT NULL,
    "accion" VARCHAR(30) NOT NULL,
    "cambios" JSONB,
    "direccion_ip" INET,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_usuario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "expira_en" TIMESTAMPTZ(6) NOT NULL,
    "revocada_en" TIMESTAMPTZ(6),
    "ultimo_uso_en" TIMESTAMPTZ(6),
    "creada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "envios_pedido" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "transportista" VARCHAR(120),
    "codigo_seguimiento" VARCHAR(120),
    "estado" "EstadoEnvio" NOT NULL DEFAULT 'pendiente',
    "costo" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "despachado_en" TIMESTAMPTZ(6),
    "entregado_en" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "envios_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_envio" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "envio_id" UUID NOT NULL,
    "estado" "EstadoEnvio" NOT NULL,
    "descripcion" VARCHAR(500),
    "ubicacion" VARCHAR(180),
    "ocurrido_en" TIMESTAMPTZ(6) NOT NULL,
    "recibido_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_envio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medios_pago" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "tipo" "TipoMedioPago" NOT NULL,
    "requiere_referencia" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "medios_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_tienda" (
    "empresa_id" UUID NOT NULL,
    "precios_incluyen_igv" BOOLEAN NOT NULL DEFAULT true,
    "mostrar_stock_disponible" BOOLEAN NOT NULL DEFAULT false,
    "permitir_pedidos" BOOLEAN NOT NULL DEFAULT true,
    "compra_minima" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "configuracion_tienda_pkey" PRIMARY KEY ("empresa_id")
);

-- CreateTable
CREATE TABLE "promociones_pedidos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "promocion_id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "descuento_aplicado" DECIMAL(14,2) NOT NULL,
    "codigo_aplicado" VARCHAR(40),
    "aplicado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promociones_pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reembolsos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "cobro_id" UUID,
    "monto" DECIMAL(14,2) NOT NULL,
    "estado" "EstadoReembolso" NOT NULL DEFAULT 'solicitado',
    "motivo" VARCHAR(500),
    "referencia" VARCHAR(120),
    "solicitado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "procesado_en" TIMESTAMPTZ(6),

    CONSTRAINT "reembolsos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_ruc_key" ON "empresas"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_empresa_id_correo_key" ON "usuarios"("empresa_id", "correo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_id_empresa_id_key" ON "usuarios"("id", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_empresa_id_nombre_key" ON "roles"("empresa_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "roles_id_empresa_id_key" ON "roles"("id", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_codigo_key" ON "permisos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_empresa_id_tipo_documento_numero_documento_key" ON "clientes"("empresa_id", "tipo_documento", "numero_documento");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_id_empresa_id_key" ON "clientes"("id", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_empresa_id_tipo_documento_numero_documento_key" ON "proveedores"("empresa_id", "tipo_documento", "numero_documento");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_id_empresa_id_key" ON "proveedores"("id", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_empresa_id_nombre_key" ON "categorias"("empresa_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_id_empresa_id_key" ON "categorias"("id", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "productos_empresa_id_sku_key" ON "productos"("empresa_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "productos_id_empresa_id_key" ON "productos"("id", "empresa_id");

-- CreateIndex
CREATE INDEX "variantes_producto_producto_id_activa_idx" ON "variantes_producto"("producto_id", "activa");

-- CreateIndex
CREATE UNIQUE INDEX "variantes_producto_empresa_id_sku_key" ON "variantes_producto"("empresa_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "variantes_producto_id_empresa_id_key" ON "variantes_producto"("id", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "imagenes_productos_producto_id_posicion_key" ON "imagenes_productos"("producto_id", "posicion");

-- CreateIndex
CREATE UNIQUE INDEX "listas_precios_empresa_id_nombre_key" ON "listas_precios"("empresa_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "listas_precios_id_empresa_id_key" ON "listas_precios"("id", "empresa_id");

-- CreateIndex
CREATE INDEX "precios_productos_variante_id_vigente_desde_idx" ON "precios_productos"("variante_id", "vigente_desde");

-- CreateIndex
CREATE UNIQUE INDEX "precios_productos_lista_precios_id_producto_id_cantidad_min_key" ON "precios_productos"("lista_precios_id", "producto_id", "cantidad_minima", "vigente_desde");

-- CreateIndex
CREATE UNIQUE INDEX "almacenes_empresa_id_codigo_key" ON "almacenes"("empresa_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "almacenes_id_empresa_id_key" ON "almacenes"("id", "empresa_id");

-- CreateIndex
CREATE INDEX "ordenes_compra_empresa_id_estado_fecha_emision_idx" ON "ordenes_compra"("empresa_id", "estado", "fecha_emision" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_compra_empresa_id_numero_key" ON "ordenes_compra"("empresa_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_compra_id_empresa_id_key" ON "ordenes_compra"("id", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "recepciones_compra_empresa_id_numero_key" ON "recepciones_compra"("empresa_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "recepciones_compra_id_empresa_id_key" ON "recepciones_compra"("id", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "detalles_recepcion_id_empresa_id_key" ON "detalles_recepcion"("id", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_detalle_recepcion_id_key" ON "lotes"("detalle_recepcion_id");

-- CreateIndex
CREATE INDEX "lotes_producto_id_estado_fecha_ingreso_idx" ON "lotes"("producto_id", "estado", "fecha_ingreso");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_empresa_id_codigo_key" ON "lotes"("empresa_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_id_empresa_id_key" ON "lotes"("id", "empresa_id");

-- CreateIndex
CREATE INDEX "existencias_lotes_empresa_id_almacen_id_idx" ON "existencias_lotes"("empresa_id", "almacen_id");

-- CreateIndex
CREATE UNIQUE INDEX "existencias_lotes_lote_id_almacen_id_key" ON "existencias_lotes"("lote_id", "almacen_id");

-- CreateIndex
CREATE INDEX "cotizaciones_empresa_id_estado_vence_en_idx" ON "cotizaciones"("empresa_id", "estado", "vence_en");

-- CreateIndex
CREATE UNIQUE INDEX "cotizaciones_empresa_id_numero_key" ON "cotizaciones"("empresa_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "cotizaciones_id_empresa_id_key" ON "cotizaciones"("id", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_cotizacion_id_key" ON "pedidos"("cotizacion_id");

-- CreateIndex
CREATE INDEX "pedidos_empresa_id_estado_creado_en_idx" ON "pedidos"("empresa_id", "estado", "creado_en" DESC);

-- CreateIndex
CREATE INDEX "pedidos_cliente_id_creado_en_idx" ON "pedidos"("cliente_id", "creado_en" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_empresa_id_numero_key" ON "pedidos"("empresa_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_id_empresa_id_key" ON "pedidos"("id", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "lineas_pedido_id_pedido_id_key" ON "lineas_pedido"("id", "pedido_id");

-- CreateIndex
CREATE UNIQUE INDEX "comprobantes_empresa_id_tipo_serie_correlativo_key" ON "comprobantes"("empresa_id", "tipo", "serie", "correlativo");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_por_cobrar_pedido_id_key" ON "cuentas_por_cobrar"("pedido_id");

-- CreateIndex
CREATE INDEX "cuentas_por_cobrar_empresa_id_estado_fecha_vencimiento_idx" ON "cuentas_por_cobrar"("empresa_id", "estado", "fecha_vencimiento");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_por_cobrar_id_empresa_id_key" ON "cuentas_por_cobrar"("id", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_por_pagar_orden_compra_id_key" ON "cuentas_por_pagar"("orden_compra_id");

-- CreateIndex
CREATE INDEX "cuentas_por_pagar_empresa_id_estado_fecha_vencimiento_idx" ON "cuentas_por_pagar"("empresa_id", "estado", "fecha_vencimiento");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_por_pagar_id_empresa_id_key" ON "cuentas_por_pagar"("id", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_caja_id_empresa_id_key" ON "sesiones_caja"("id", "empresa_id");

-- CreateIndex
CREATE INDEX "gastos_empresa_id_fecha_idx" ON "gastos"("empresa_id", "fecha" DESC);

-- CreateIndex
CREATE INDEX "cobros_pedido_id_recibido_en_idx" ON "cobros"("pedido_id", "recibido_en");

-- CreateIndex
CREATE UNIQUE INDEX "cobros_id_empresa_id_key" ON "cobros"("id", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "movimientos_caja_cobro_id_key" ON "movimientos_caja"("cobro_id");

-- CreateIndex
CREATE UNIQUE INDEX "movimientos_caja_gasto_id_key" ON "movimientos_caja"("gasto_id");

-- CreateIndex
CREATE INDEX "movimientos_caja_sesion_caja_id_creado_en_idx" ON "movimientos_caja"("sesion_caja_id", "creado_en");

-- CreateIndex
CREATE INDEX "movimientos_inventario_lote_id_creado_en_idx" ON "movimientos_inventario"("lote_id", "creado_en");

-- CreateIndex
CREATE UNIQUE INDEX "movimientos_inventario_empresa_id_clave_idempotencia_key" ON "movimientos_inventario"("empresa_id", "clave_idempotencia");

-- CreateIndex
CREATE INDEX "reservas_inventario_estado_expira_en_idx" ON "reservas_inventario"("estado", "expira_en");

-- CreateIndex
CREATE UNIQUE INDEX "reservas_inventario_empresa_id_clave_idempotencia_key" ON "reservas_inventario"("empresa_id", "clave_idempotencia");

-- CreateIndex
CREATE UNIQUE INDEX "traslados_empresa_id_numero_key" ON "traslados"("empresa_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "devoluciones_empresa_id_numero_key" ON "devoluciones"("empresa_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "promociones_empresa_id_codigo_key" ON "promociones"("empresa_id", "codigo");

-- CreateIndex
CREATE INDEX "registro_auditoria_empresa_id_entidad_entidad_id_creado_en_idx" ON "registro_auditoria"("empresa_id", "entidad", "entidad_id", "creado_en");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_usuario_token_hash_key" ON "sesiones_usuario"("token_hash");

-- CreateIndex
CREATE INDEX "sesiones_usuario_usuario_id_revocada_en_expira_en_idx" ON "sesiones_usuario"("usuario_id", "revocada_en", "expira_en");

-- CreateIndex
CREATE INDEX "envios_pedido_empresa_id_estado_creado_en_idx" ON "envios_pedido"("empresa_id", "estado", "creado_en");

-- CreateIndex
CREATE INDEX "envios_pedido_codigo_seguimiento_idx" ON "envios_pedido"("codigo_seguimiento");

-- CreateIndex
CREATE INDEX "eventos_envio_envio_id_ocurrido_en_idx" ON "eventos_envio"("envio_id", "ocurrido_en");

-- CreateIndex
CREATE UNIQUE INDEX "medios_pago_empresa_id_nombre_key" ON "medios_pago"("empresa_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "medios_pago_id_empresa_id_key" ON "medios_pago"("id", "empresa_id");

-- CreateIndex
CREATE INDEX "promociones_pedidos_empresa_id_aplicado_en_idx" ON "promociones_pedidos"("empresa_id", "aplicado_en");

-- CreateIndex
CREATE UNIQUE INDEX "promociones_pedidos_promocion_id_pedido_id_key" ON "promociones_pedidos"("promocion_id", "pedido_id");

-- CreateIndex
CREATE INDEX "reembolsos_empresa_id_estado_solicitado_en_idx" ON "reembolsos"("empresa_id", "estado", "solicitado_en");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "usuarios_roles_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "usuarios_roles_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "permisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direcciones_clientes" ADD CONSTRAINT "direcciones_clientes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_categoria_padre_id_fkey" FOREIGN KEY ("categoria_padre_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variantes_producto" ADD CONSTRAINT "variantes_producto_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variantes_producto" ADD CONSTRAINT "variantes_producto_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imagenes_productos" ADD CONSTRAINT "imagenes_productos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listas_precios" ADD CONSTRAINT "listas_precios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precios_productos" ADD CONSTRAINT "precios_productos_lista_precios_id_fkey" FOREIGN KEY ("lista_precios_id") REFERENCES "listas_precios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precios_productos" ADD CONSTRAINT "precios_productos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precios_productos" ADD CONSTRAINT "precios_productos_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "variantes_producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacenes" ADD CONSTRAINT "almacenes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_creada_por_fkey" FOREIGN KEY ("creada_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_orden_compra" ADD CONSTRAINT "lineas_orden_compra_orden_compra_id_fkey" FOREIGN KEY ("orden_compra_id") REFERENCES "ordenes_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_orden_compra" ADD CONSTRAINT "lineas_orden_compra_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_orden_compra" ADD CONSTRAINT "lineas_orden_compra_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "variantes_producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepciones_compra" ADD CONSTRAINT "recepciones_compra_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepciones_compra" ADD CONSTRAINT "recepciones_compra_orden_compra_id_fkey" FOREIGN KEY ("orden_compra_id") REFERENCES "ordenes_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepciones_compra" ADD CONSTRAINT "recepciones_compra_recibida_por_fkey" FOREIGN KEY ("recibida_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_recepcion" ADD CONSTRAINT "detalles_recepcion_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_recepcion" ADD CONSTRAINT "detalles_recepcion_recepcion_id_fkey" FOREIGN KEY ("recepcion_id") REFERENCES "recepciones_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_recepcion" ADD CONSTRAINT "detalles_recepcion_linea_orden_compra_id_fkey" FOREIGN KEY ("linea_orden_compra_id") REFERENCES "lineas_orden_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_recepcion" ADD CONSTRAINT "detalles_recepcion_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "variantes_producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_detalle_recepcion_id_fkey" FOREIGN KEY ("detalle_recepcion_id") REFERENCES "detalles_recepcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "existencias_lotes" ADD CONSTRAINT "existencias_lotes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "existencias_lotes" ADD CONSTRAINT "existencias_lotes_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "existencias_lotes" ADD CONSTRAINT "existencias_lotes_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_creada_por_fkey" FOREIGN KEY ("creada_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_cotizacion" ADD CONSTRAINT "lineas_cotizacion_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_cotizacion" ADD CONSTRAINT "lineas_cotizacion_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_cotizacion" ADD CONSTRAINT "lineas_cotizacion_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "variantes_producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "cotizaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_pedido" ADD CONSTRAINT "lineas_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_pedido" ADD CONSTRAINT "lineas_pedido_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_pedido" ADD CONSTRAINT "lineas_pedido_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "variantes_producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobantes" ADD CONSTRAINT "comprobantes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobantes" ADD CONSTRAINT "comprobantes_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_por_cobrar" ADD CONSTRAINT "cuentas_por_cobrar_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_por_cobrar" ADD CONSTRAINT "cuentas_por_cobrar_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_por_cobrar" ADD CONSTRAINT "cuentas_por_cobrar_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_por_pagar" ADD CONSTRAINT "cuentas_por_pagar_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_por_pagar" ADD CONSTRAINT "cuentas_por_pagar_orden_compra_id_fkey" FOREIGN KEY ("orden_compra_id") REFERENCES "ordenes_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_por_pagar" ADD CONSTRAINT "cuentas_por_pagar_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_usuario_apertura_id_fkey" FOREIGN KEY ("usuario_apertura_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_usuario_cierre_id_fkey" FOREIGN KEY ("usuario_cierre_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_sesion_caja_id_fkey" FOREIGN KEY ("sesion_caja_id") REFERENCES "sesiones_caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_medio_pago_id_fkey" FOREIGN KEY ("medio_pago_id") REFERENCES "medios_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_cuenta_por_cobrar_id_fkey" FOREIGN KEY ("cuenta_por_cobrar_id") REFERENCES "cuentas_por_cobrar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_sesion_caja_id_fkey" FOREIGN KEY ("sesion_caja_id") REFERENCES "sesiones_caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_medio_pago_id_fkey" FOREIGN KEY ("medio_pago_id") REFERENCES "medios_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_proveedores" ADD CONSTRAINT "pagos_proveedores_cuenta_por_pagar_id_fkey" FOREIGN KEY ("cuenta_por_pagar_id") REFERENCES "cuentas_por_pagar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_proveedores" ADD CONSTRAINT "pagos_proveedores_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_proveedores" ADD CONSTRAINT "pagos_proveedores_medio_pago_id_fkey" FOREIGN KEY ("medio_pago_id") REFERENCES "medios_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_sesion_caja_id_fkey" FOREIGN KEY ("sesion_caja_id") REFERENCES "sesiones_caja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_cobro_id_fkey" FOREIGN KEY ("cobro_id") REFERENCES "cobros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_gasto_id_fkey" FOREIGN KEY ("gasto_id") REFERENCES "gastos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_linea_pedido_id_fkey" FOREIGN KEY ("linea_pedido_id") REFERENCES "lineas_pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_detalle_recepcion_id_fkey" FOREIGN KEY ("detalle_recepcion_id") REFERENCES "detalles_recepcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_movimiento_revertido_id_fkey" FOREIGN KEY ("movimiento_revertido_id") REFERENCES "movimientos_inventario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_traslado_id_fkey" FOREIGN KEY ("traslado_id") REFERENCES "traslados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_inventario" ADD CONSTRAINT "reservas_inventario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_inventario" ADD CONSTRAINT "reservas_inventario_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_inventario" ADD CONSTRAINT "reservas_inventario_linea_pedido_id_fkey" FOREIGN KEY ("linea_pedido_id") REFERENCES "lineas_pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_inventario" ADD CONSTRAINT "reservas_inventario_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traslados" ADD CONSTRAINT "traslados_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traslados" ADD CONSTRAINT "traslados_almacen_origen_id_fkey" FOREIGN KEY ("almacen_origen_id") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traslados" ADD CONSTRAINT "traslados_almacen_destino_id_fkey" FOREIGN KEY ("almacen_destino_id") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traslados" ADD CONSTRAINT "traslados_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traslados" ADD CONSTRAINT "traslados_recibido_por_fkey" FOREIGN KEY ("recibido_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_traslado" ADD CONSTRAINT "lineas_traslado_traslado_id_fkey" FOREIGN KEY ("traslado_id") REFERENCES "traslados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_traslado" ADD CONSTRAINT "lineas_traslado_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_traslado" ADD CONSTRAINT "lineas_traslado_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_solicitado_por_fkey" FOREIGN KEY ("solicitado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_devolucion" ADD CONSTRAINT "lineas_devolucion_devolucion_id_fkey" FOREIGN KEY ("devolucion_id") REFERENCES "devoluciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_devolucion" ADD CONSTRAINT "lineas_devolucion_linea_pedido_id_fkey" FOREIGN KEY ("linea_pedido_id") REFERENCES "lineas_pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promociones" ADD CONSTRAINT "promociones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promociones_productos" ADD CONSTRAINT "promociones_productos_promocion_id_fkey" FOREIGN KEY ("promocion_id") REFERENCES "promociones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promociones_productos" ADD CONSTRAINT "promociones_productos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados_documentos" ADD CONSTRAINT "historial_estados_documentos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados_documentos" ADD CONSTRAINT "historial_estados_documentos_cambiado_por_fkey" FOREIGN KEY ("cambiado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_auditoria" ADD CONSTRAINT "registro_auditoria_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_auditoria" ADD CONSTRAINT "registro_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_usuario" ADD CONSTRAINT "sesiones_usuario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_usuario" ADD CONSTRAINT "sesiones_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envios_pedido" ADD CONSTRAINT "envios_pedido_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envios_pedido" ADD CONSTRAINT "envios_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_envio" ADD CONSTRAINT "eventos_envio_envio_id_fkey" FOREIGN KEY ("envio_id") REFERENCES "envios_pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medios_pago" ADD CONSTRAINT "medios_pago_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_tienda" ADD CONSTRAINT "configuracion_tienda_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promociones_pedidos" ADD CONSTRAINT "promociones_pedidos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promociones_pedidos" ADD CONSTRAINT "promociones_pedidos_promocion_id_fkey" FOREIGN KEY ("promocion_id") REFERENCES "promociones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promociones_pedidos" ADD CONSTRAINT "promociones_pedidos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reembolsos" ADD CONSTRAINT "reembolsos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reembolsos" ADD CONSTRAINT "reembolsos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reembolsos" ADD CONSTRAINT "reembolsos_cobro_id_fkey" FOREIGN KEY ("cobro_id") REFERENCES "cobros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Restricciones de dominio que Prisma Schema Language todavía no expresa.
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_tasa_igv_rango" CHECK ("tasa_igv" >= 0 AND "tasa_igv" <= 1);
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_limite_credito_no_negativo" CHECK ("limite_credito" >= 0 AND "condicion_pago_dias" >= 0);
ALTER TABLE "productos" ADD CONSTRAINT "productos_stock_minimo_no_negativo" CHECK ("stock_minimo" >= 0 AND "tasa_igv" >= 0 AND "tasa_igv" <= 1);
ALTER TABLE "precios_productos" ADD CONSTRAINT "precios_productos_importes_validos" CHECK ("cantidad_minima" > 0 AND "precio_unitario" >= 0 AND ("vigente_hasta" IS NULL OR "vigente_hasta" > "vigente_desde"));
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_importes_no_negativos" CHECK ("subtotal" >= 0 AND "impuesto" >= 0 AND "total" >= 0);
ALTER TABLE "lineas_orden_compra" ADD CONSTRAINT "lineas_compra_cantidades_validas" CHECK ("cantidad_pedida" > 0 AND "cantidad_recibida" >= 0 AND "cantidad_recibida" <= "cantidad_pedida" AND "costo_unitario" >= 0);
ALTER TABLE "detalles_recepcion" ADD CONSTRAINT "detalles_recepcion_cantidad_positiva" CHECK ("cantidad" > 0);
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_costo_no_negativo" CHECK ("costo_unitario" >= 0);
ALTER TABLE "existencias_lotes" ADD CONSTRAINT "existencias_cantidades_validas" CHECK ("cantidad_fisica" >= 0 AND "cantidad_reservada" >= 0 AND "cantidad_reservada" <= "cantidad_fisica");
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_vigencia_importes_validos" CHECK ("vence_en" > "emitida_en" AND "subtotal" >= 0 AND "descuento" >= 0 AND "impuesto" >= 0 AND "total" >= 0);
ALTER TABLE "lineas_cotizacion" ADD CONSTRAINT "lineas_cotizacion_importes_validos" CHECK ("cantidad" > 0 AND "precio_unitario" >= 0 AND "descuento" >= 0 AND "total_linea" >= 0 AND "tasa_igv" >= 0 AND "tasa_igv" <= 1);
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_importes_no_negativos" CHECK ("subtotal" >= 0 AND "descuento" >= 0 AND "impuesto" >= 0 AND "costo_envio" >= 0 AND "total" >= 0);
ALTER TABLE "lineas_pedido" ADD CONSTRAINT "lineas_pedido_importes_validos" CHECK ("cantidad" > 0 AND "precio_unitario" >= 0 AND "descuento" >= 0 AND "total_linea" >= 0 AND "tasa_igv" >= 0 AND "tasa_igv" <= 1);
ALTER TABLE "cuentas_por_cobrar" ADD CONSTRAINT "cuentas_por_cobrar_monto_positivo" CHECK ("monto_original" > 0);
ALTER TABLE "cuentas_por_pagar" ADD CONSTRAINT "cuentas_por_pagar_monto_positivo" CHECK ("monto_original" > 0);
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_cierre_coherente" CHECK (("estado" = 'abierta' AND "cerrada_en" IS NULL) OR ("estado" = 'cerrada' AND "cerrada_en" IS NOT NULL));
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_monto_positivo" CHECK ("monto" > 0);
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_monto_positivo" CHECK ("monto" > 0);
ALTER TABLE "pagos_proveedores" ADD CONSTRAINT "pagos_proveedores_monto_positivo" CHECK ("monto" > 0);
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_monto_positivo" CHECK ("monto" > 0);
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_cantidad_positiva" CHECK ("cantidad" > 0);
ALTER TABLE "reservas_inventario" ADD CONSTRAINT "reservas_inventario_cantidad_positiva" CHECK ("cantidad" > 0);
ALTER TABLE "traslados" ADD CONSTRAINT "traslados_almacenes_distintos" CHECK ("almacen_origen_id" <> "almacen_destino_id");
ALTER TABLE "lineas_traslado" ADD CONSTRAINT "lineas_traslado_cantidades_validas" CHECK ("cantidad_enviada" > 0 AND "cantidad_recibida" >= 0 AND "cantidad_recibida" <= "cantidad_enviada");
ALTER TABLE "lineas_devolucion" ADD CONSTRAINT "lineas_devolucion_importes_validos" CHECK ("cantidad" > 0 AND "monto_reembolsado" >= 0);
ALTER TABLE "promociones" ADD CONSTRAINT "promociones_vigencia_valida" CHECK ("valor" >= 0 AND "compra_minima" >= 0 AND "usos_actuales" >= 0 AND ("usos_maximos" IS NULL OR "usos_maximos" > 0) AND ("vigente_hasta" IS NULL OR "vigente_hasta" > "vigente_desde"));
ALTER TABLE "envios_pedido" ADD CONSTRAINT "envios_costo_no_negativo" CHECK ("costo" >= 0);
ALTER TABLE "reembolsos" ADD CONSTRAINT "reembolsos_monto_positivo" CHECK ("monto" > 0);
CREATE UNIQUE INDEX "sesiones_caja_una_abierta_por_almacen" ON "sesiones_caja"("almacen_id") WHERE "estado" = 'abierta';
