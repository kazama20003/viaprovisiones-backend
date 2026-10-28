# Límites de los contextos

Cada carpeta de contexto es un módulo de NestJS independiente dentro del mismo proceso. La aplicación es un monolito modular; no se separa en microservicios antes de tener una necesidad operativa que lo justifique.

Al agregar funcionalidad, crear dentro del contexto:

```text
<contexto>/
  dominio/           # Agregados, objetos de valor, eventos, reglas e interfaces del repositorio
  aplicacion/        # Casos de uso y puertos de entrada/salida
  infraestructura/   # Adaptadores SQL, repositorios concretos e integraciones
  presentacion/      # Controladores HTTP y DTO de transporte
```

Reglas de dependencia:

1. `dominio` no importa NestJS, SQL ni otro contexto.
2. `aplicacion` coordina agregados y puertos; no depende de controladores ni ORM.
3. `infraestructura` implementa interfaces definidas hacia adentro. Aquí viven los repositorios Prisma y sus mapeadores entre filas/modelos y agregados.
4. `presentacion` traduce HTTP a comandos/consultas; no contiene reglas de negocio.
5. Un contexto no importa entidades, repositorios ni servicios internos de otro contexto. Para una colaboración entre contextos se define un puerto o evento explícito.
6. Los DTO HTTP no se reutilizan como entidades de dominio ni como modelos de persistencia.
7. Las operaciones que reservan o consumen existencia, reciben compras, convierten cotizaciones, registran cobros o cierran caja deben ejecutarse dentro de una transacción de base de datos.

Los módulos NestJS actuales solo declaran los límites. No se agregaron controladores ficticios ni persistencia incompleta.
