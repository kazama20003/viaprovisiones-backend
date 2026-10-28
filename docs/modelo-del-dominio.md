# Modelo del dominio de VIA Provisiones

## Alcance

Este primer modelo parte de los flujos que muestran las pantallas en `viaprovisiones-frontend/app/design-views`. Los productos, clientes y cifras allí mostrados son datos de demostración, no datos reales ni reglas confirmadas. La persistencia usa PostgreSQL con Prisma; `prisma/schema.prisma` es la fuente de verdad y `prisma/migrations/` conserva su evolución.

## Lenguaje ubicuo

| Concepto | Definición compartida |
| --- | --- |
| Producto | Familia de artículos que se ofrece y compra. Sus variantes pueden tener SKU y código de barras propios; ni el producto ni la variante guardan stock agregado. |
| Variante | Presentación vendible de un producto, definida por atributos como color, talla o capacidad. |
| Lote | Partida trazable de una variante o producto con costo unitario, proveedor y fechas relevantes; puede distribuirse entre almacenes. |
| Existencia | Saldo físico y reservado de un lote en un almacén. Se actualiza en la misma transacción que registra el movimiento histórico. |
| Pedido | Compromiso de venta con un cliente; conserva el precio, impuestos, descripción y entrega acordados. |
| Cotización | Oferta con vigencia que puede aceptarse y convertirse en un único pedido. |
| Orden de compra | Solicitud al proveedor que puede recibirse de forma parcial. Cada recepción aceptada crea lotes. |
| Movimiento de inventario | Hecho histórico que explica una entrada, salida, reserva, liberación, devolución o ajuste. |
| Cuenta por cobrar | Saldo pendiente de una venta a crédito, reducido por cobros registrados. |
| Caja | Turno de un usuario con apertura, movimientos y cierre conciliado. |
| Comprobante | Boleta o factura asociada a una venta, con su propia numeración y estado de emisión. |
| Envío | Despacho de un pedido con transportista y código de seguimiento; conserva eventos logísticos históricos. |
| Reembolso | Devolución de dinero vinculada a un pedido y opcionalmente a un cobro concreto. |
| Medio de pago | Forma de cobro o pago configurada por empresa, con nombre y tipo, conservando además el nombre usado en la operación. |

## Contextos delimitados

| Contexto | Agregado raíz | Responsabilidad |
| --- | --- | --- |
| Acceso | Usuario | Usuarios, sesiones revocables, roles y permisos del panel. |
| Catálogo | Producto, Variante, Lista de precios | Ficha comercial, variantes, categorías, imágenes y precios por lista; no controla stock. |
| Clientes | Cliente | Identidad, segmento, contactos, direcciones, condición y límite de crédito. |
| Proveedores | Proveedor | Identidad y contacto del abastecedor; no se confunde con un cliente. |
| Ventas | Pedido, Cotización | Cotizar, confirmar, preparar y completar ventas. Conserva una instantánea de cada línea. |
| Inventario | Lote, Existencia, Almacén | Saldos por lote y ubicación, reservas con vencimiento e historial de movimientos idempotentes. |
| Abastecimiento | Orden de compra | Solicitar productos y aceptar recepciones parciales o completas. |
| Finanzas | Caja, Gasto, Cuenta por cobrar | Cobros, pagos, reembolsos, saldos, gastos y sesiones de caja. |
| Tienda | Promoción, Banner, Configuración de tienda | Ofertas aplicadas a pedidos, reglas de presentación comercial y contenido publicado. |
| Despacho | Envío | Seguimiento y eventos de entrega vinculados al pedido. |

Los contextos no comparten entidades de dominio. Se coordinan mediante casos de uso y referencias identificables; PostgreSQL mantiene la integridad referencial.

## Reglas iniciales

1. Los importes usan `numeric`, nunca punto flotante. La moneda predeterminada es PEN y el IGV predeterminado es 18 %; cada documento conserva moneda y tasa histórica.
2. Las líneas de pedido y cotización guardan SKU, descripción, cantidad, precio, descuento, impuesto y total al emitir el documento, aunque el producto cambie después.
3. El estado comercial/logístico del pedido es independiente del estado de pago. El flujo habitual es `por_pagar → pagado → preparando → enviado → entregado`; cancelar requiere una transición explícita.
4. Solo una cotización aceptada y vigente se convierte en pedido. La conversión registra la relación y no reserva ni descuenta stock dos veces.
5. Una orden de compra admite varias recepciones. Lo recibido no puede superar lo pedido sin una política explícita.
6. `ExistenciaLote` mantiene saldos físicos y reservados por lote y almacén para consultas rápidas. Cada cambio de saldo debe ocurrir en una transacción junto con un `MovimientoInventario` inmutable; los casos de uso bloquean o actualizan el saldo de forma atómica para impedir sobreventa. No se permite stock reservado mayor al físico ni stock negativo.
7. El costo de venta se toma del lote asignado. FIFO, selección manual u otra política debe ser configurable y quedar registrada.
8. Movimientos de caja e inventario son hechos inmutables. Las correcciones se registran con reversión o ajuste, nunca editando el hecho original.
9. No se presume una integración SUNAT. El comprobante conserva estado y datos externos cuando se implemente un proveedor de emisión.
10. Las raíces de negocio se asocian a una empresa. Los detalles pertenecen a su agregado; los casos de uso siempre deben aplicar el ámbito de empresa al consultar o modificar datos. Las relaciones entre empresas deben verificarse explícitamente en las transacciones de aplicación; no basta con confiar en identificadores recibidos por HTTP.
11. Una clave de idempotencia identifica como máximo una escritura de inventario o reserva por empresa. Las sesiones guardan solo el hash del token, nunca el token de acceso.
12. Los eventos de envío son históricos. La promoción aplicada y el descuento efectivo se guardan como instantánea en el pedido para que los cambios futuros de la promoción no reescriban una venta anterior.

## Organización sugerida en NestJS

```text
src/
  contextos/
    acceso/{dominio,aplicacion,infraestructura,presentacion}/
    catalogo/{dominio,aplicacion,infraestructura,presentacion}/
    clientes/{dominio,aplicacion,infraestructura,presentacion}/
    proveedores/{dominio,aplicacion,infraestructura,presentacion}/
    ventas/{dominio,aplicacion,infraestructura,presentacion}/
    inventario/{dominio,aplicacion,infraestructura,presentacion}/
    abastecimiento/{dominio,aplicacion,infraestructura,presentacion}/
    finanzas/{dominio,aplicacion,infraestructura,presentacion}/
    tienda/{dominio,aplicacion,infraestructura,presentacion}/
  compartido/{dominio,infraestructura}/
```

- `dominio`: agregados, entidades, objetos de valor, eventos y reglas; sin NestJS ni base de datos.
- `aplicacion`: casos de uso y puertos que coordinan el dominio.
- `infraestructura`: adaptadores PostgreSQL, repositorios y servicios externos.
- `presentacion`: controladores HTTP, DTO de transporte y validación de entrada.

Los casos de uso se nombran con acciones del negocio: `CrearPedido`, `AceptarCotizacion`, `RegistrarRecepcion`, `TrasladarExistencias`, `RegistrarCobro` y `CerrarCaja`. Los controladores no implementan reglas comerciales.

## Decisiones que requieren confirmación del negocio

- Si los precios visibles incluyen IGV o lo agregan al pagar.
- Tipos de comprobante y proveedor de emisión electrónica/SUNAT.
- Política de reservas, asignación de lotes, devoluciones, garantía y crédito.
- Si desde el primer lanzamiento habrá varias empresas, sucursales, monedas o almacenes.
- Las combinaciones válidas de atributos de variante y qué variantes deben tener precio independiente.
- Políticas de vencimiento/liberación automática de reservas, reembolsos parciales y múltiples despachos por pedido.
- Retención de datos personales y alcance de auditoría.

El esquema es una base de diseño, no debe usarse todavía para ventas reales sin confirmar esos puntos y revisar/aplicar las migraciones versionadas.
