# Backend de VIA Provisiones

Backend NestJS organizado como **monolito modular** con contextos delimitados por responsabilidad del negocio. La propuesta usa DDD táctico y lenguaje ubicuo en español. El frontend Next.js consume el catálogo público y los endpoints conectados del panel mediante TanStack Query.

## Documentos de diseño

- [`docs/modelo-del-dominio.md`](docs/modelo-del-dominio.md): vocabulario, contextos, agregados, reglas y decisiones pendientes.
- [`docs/contrato-http.md`](docs/contrato-http.md): contrato REST versionado pensado para consumo desde TanStack Query.
- [`prisma/schema.prisma`](prisma/schema.prisma): fuente de verdad del modelo relacional PostgreSQL.

## Contextos NestJS

`src/contextos/` contiene los módulos de composición iniciales: `acceso`, `catalogo`, `clientes`, `proveedores`, `ventas`, `inventario`, `abastecimiento`, `finanzas` y `tienda`. Cada contexto crecerá por capas: `dominio`, `aplicacion`, `infraestructura` y `presentacion`. El dominio no debe importar NestJS ni acceder directamente a la base de datos.

Los módulos de negocio son todavía límites estructurales; aún no incluyen controladores ni repositorios de casos de uso. `PrismaModule` y `PrismaService` ya crean el cliente PostgreSQL; el servidor necesita una `DATABASE_URL` válida para conectarse.

La tienda consume el catálogo público desde `GET /api/v1/tienda/productos` mediante TanStack Query. Copia `.env.example` a `.env`, configura `DATABASE_URL` y el UUID `EMPRESA_ID` de la empresa; el frontend toma `NEXT_PUBLIC_API_URL` desde su propio `.env.local` (ver `viaprovisiones-frontend/.env.example`). El estado de API/base de datos se consulta en `GET /api/v1/salud`.

Para crear la empresa inicial, el rol Administrador y su usuario, define los campos `BOOTSTRAP_*` en `.env` y ejecuta `pnpm db:bootstrap` después de aplicar las migraciones. El comando imprime el UUID de la empresa que debes copiar a `EMPRESA_ID`; reinicia el servidor para que el login y catálogo usen esa empresa. El inicio de sesión crea una cookie HttpOnly revocable (8 horas, o 30 días al elegir mantener la sesión). Al cerrar sesión se revoca el token incluso si ya venció. Los endpoints de productos, clientes, pedidos y resumen validan permisos del rol; el bootstrap asigna esos permisos al Administrador. El panel permite avanzar pedidos pagados, preparados y enviados respetando las transiciones válidas.

La recuperación por correo requiere configurar un proveedor de correo transaccional; mientras no exista, el formulario indica que se debe solicitar el restablecimiento al administrador. No se genera un enlace ficticio ni se revela si una cuenta existe.

## Imágenes y videos de productos

La aplicación guarda los archivos en un bucket privado de Google Cloud Storage y los sirve desde el backend. Antes de probar, configura en `.env`:

```dotenv
GCS_BUCKET=nombre-del-bucket
GOOGLE_CLOUD_PROJECT=id-del-proyecto
# Solo si usas una clave local; no copies el archivo de credenciales al repositorio.
# GOOGLE_APPLICATION_CREDENTIALS=C:/ruta/privada/credenciales.json
```

La identidad del servidor debe tener permisos para crear, leer y borrar objetos del bucket. Para desarrollo local puedes usar Application Default Credentials (`gcloud auth application-default login`) o definir `GOOGLE_APPLICATION_CREDENTIALS` con la ruta absoluta a un archivo de credenciales seguro. No pegues claves en `.env.example` ni en el código. Tras configurar el bucket, reinicia el backend. La base de datos guarda los identificadores; el bucket permanece privado y la tienda solo puede ver los archivos de productos publicados y visibles.

Guarda primero el producto y luego usa «Subir fotos o videos». Se admiten hasta 8 imágenes JPG, PNG o WebP de 10 MB cada una y hasta 3 videos MP4 o WebM de 50 MB cada uno. Selecciona una imagen para hacerla principal. El backend comprueba la sesión, los permisos, el formato y el tamaño. La ficha pública de producto todavía contiene datos de ejemplo y necesita conectarse para mostrar la galería completa.

## Base de datos

El esquema Prisma define las entidades y relaciones iniciales. Configura `DATABASE_URL` tomando como referencia `.env.example`, genera el cliente con `pnpm db:generate` y aplica migraciones en desarrollo con `pnpm db:migrate:dev -- --name nombre_del_cambio`. En producción usa `pnpm db:migrate:deploy`. No guardes credenciales en el repositorio.

Valores iniciales: moneda PEN e IGV 18 %. Cada documento conserva su moneda e impuesto históricos; el modo de mostrar precios con IGV debe confirmarse con el negocio.

## Comandos

```powershell
pnpm install
pnpm start:dev
pnpm build
pnpm db:validate
```

`PrismaModule` expone `PrismaService` como proveedor compartido. Los repositorios Prisma pertenecen a `infraestructura` dentro de cada contexto; los agregados no importan el cliente generado.

