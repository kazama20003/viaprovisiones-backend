# Contrato HTTP para el frontend

El frontend puede consumir el backend con TanStack Query sin cambiar sus pantallas actuales. La API propuesta usa JSON, rutas versionadas bajo `/api/v1` y recursos en plural con nombres españoles. El cliente HTTP debe leer la URL base de `NEXT_PUBLIC_API_URL`; el servidor habilitará CORS solo para el origen configurado.

**Estado de integración:** Next.js ya usa TanStack Query para consultar el catálogo público. El contrato inicial implementado es `GET /api/v1/salud`, `GET /api/v1/tienda/productos` y `GET /api/v1/tienda/productos/:id`. La URL del backend se configura con `NEXT_PUBLIC_API_URL`; el servidor filtra el catálogo por `EMPRESA_ID` y solo publica productos visibles y publicados.

## Rutas iniciales previstas

| Recurso | Operaciones previstas |
| --- | --- |
| `/productos` | Listar, filtrar por categoría/estado/texto, consultar detalle y administrar precios. |
| `/clientes` | Listar, filtrar por tipo y consultar ficha, pedidos y saldo. |
| `/proveedores` | Listar y consultar ficha/historial de compras. |
| `/pedidos` | Listar por estado/canal/fecha, consultar detalle, crear y registrar transiciones. |
| `/cotizaciones` | Listar, crear, enviar, aceptar y convertir a pedido. |
| `/ordenes-compra` | Listar, crear, enviar y registrar recepciones parciales. |
| `/inventario/lotes` | Consultar lotes por producto/almacén y existencias derivadas. |
| `/inventario/movimientos` | Consultar kardex filtrado por producto, lote y periodo. |
| `/traslados`, `/devoluciones` | Crear y avanzar sus flujos de recepción/aprobación. |
| `/cajas`, `/gastos`, `/cobros` | Abrir/cerrar caja y registrar movimientos financieros. |
| `/comprobantes` | Consultar comprobantes asociados a pedidos. |

Las rutas administrativas de la tabla siguen pendientes. Se implementarán detrás de autenticación y autorización por empresa antes de conectar escrituras del panel.

Las operaciones que producen efectos de negocio serán comandos dedicados (`POST /pedidos/:id/cobros`, `POST /ordenes-compra/:id/recepciones`) y no cambios arbitrarios de estado mediante `PATCH`.

## Listas, filtros y errores

```http
GET /api/v1/pedidos?estado=preparando&canal=tienda_web&pagina=1&por_pagina=25&orden=creado_en:desc
```

Respuesta de lista:

```json
{
  "datos": [],
  "paginacion": { "pagina": 1, "por_pagina": 25, "total": 0, "total_paginas": 0 }
}
```

Respuesta de error:

```json
{
  "estado": 409,
  "codigo": "existencia_insuficiente",
  "mensaje": "No hay existencia suficiente para completar el pedido.",
  "detalles": []
}
```

Usar códigos HTTP estándar (200/201/204, 400, 401, 403, 404, 409, 422, 500), orden estable y paginación limitada. Los DTO de transporte se validan en la capa de presentación; las reglas de negocio se vuelven a validar en el agregado/caso de uso. Para solicitudes repetibles de creación de pedidos, cobros o recepción, admitir una clave de idempotencia antes de exponer esas operaciones al cliente.

## TanStack Query

El backend no depende de TanStack Query: solo ofrece un contrato HTTP predecible. Las claves de consulta del frontend deben incluir todos los filtros y la paginación, por ejemplo `['pedidos', filtros]`; las escrituras invalidan las claves afectadas (`pedidos`, `inventario`, `caja`). Las transiciones devuelven el recurso actualizado para actualizar o invalidar su caché.

Este contrato es una propuesta para acordar y construir por entregas. Aún no existen controladores CRUD ni conexión a base de datos.
