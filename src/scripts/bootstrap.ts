import 'dotenv/config';
import { PrismaService } from '../compartido/infraestructura/prisma/prisma.service';
import { crearHashClave } from '../contextos/acceso/autenticacion.service';

async function bootstrap() {
  const ruc = process.env.BOOTSTRAP_RUC?.trim();
  const razonSocial = process.env.BOOTSTRAP_RAZON_SOCIAL?.trim();
  const nombreComercial = process.env.BOOTSTRAP_NOMBRE_COMERCIAL?.trim();
  const nombre = process.env.BOOTSTRAP_ADMIN_NOMBRE?.trim();
  const correo = process.env.BOOTSTRAP_ADMIN_CORREO?.trim().toLowerCase();
  const clave = process.env.BOOTSTRAP_ADMIN_CLAVE;

  if (
    (ruc && !/^\d{11}$/.test(ruc)) ||
    !razonSocial ||
    !nombreComercial ||
    !nombre ||
    !correo ||
    !clave
  ) {
    throw new Error(
      'Completa los valores BOOTSTRAP_* del .env antes de crear la empresa y el usuario administrador.',
    );
  }
  if (clave.length < 12)
    throw new Error('BOOTSTRAP_ADMIN_CLAVE debe tener al menos 12 caracteres.');

  const prisma = new PrismaService();
  try {
    await prisma.$connect();
    const empresa = ruc
      ? await prisma.empresa.upsert({
          where: { ruc },
          update: { razonSocial, nombreComercial },
          create: { ruc, razonSocial, nombreComercial },
        })
      : ((await prisma.empresa.findFirst({
          where: { ruc: null, razonSocial, nombreComercial },
        })) ??
        (await prisma.empresa.create({
          data: { razonSocial, nombreComercial },
        })));
    const rol = await prisma.rol.upsert({
      where: {
        empresaId_nombre: { empresaId: empresa.id, nombre: 'Administrador' },
      },
      update: {},
      create: {
        empresaId: empresa.id,
        nombre: 'Administrador',
        descripcion: 'Administración del negocio.',
      },
    });
    const permisos = [
      ['catalogo.productos.leer', 'Consultar productos del catálogo.'],
      ['catalogo.productos.crear', 'Crear productos del catálogo.'],
      ['catalogo.productos.editar', 'Editar productos del catálogo.'],
      ['clientes.leer', 'Consultar clientes.'],
      ['clientes.crear', 'Crear clientes.'],
      ['ventas.pedidos.leer', 'Consultar pedidos.'],
      ['ventas.pedidos.transicionar', 'Avanzar el estado de los pedidos.'],
      ['panel.resumen.leer', 'Consultar el resumen del panel.'],
    ] as const;
    for (const [codigo, descripcion] of permisos) {
      const permiso = await prisma.permiso.upsert({
        where: { codigo },
        update: { descripcion },
        create: { codigo, descripcion },
      });
      await prisma.rolPermiso.upsert({
        where: { rolId_permisoId: { rolId: rol.id, permisoId: permiso.id } },
        update: {},
        create: { rolId: rol.id, permisoId: permiso.id },
      });
    }
    const hashClave = await crearHashClave(clave);
    const usuario = await prisma.usuario.upsert({
      where: { empresaId_correo: { empresaId: empresa.id, correo } },
      update: { nombre, claveCifrada: hashClave, activo: true },
      create: {
        empresaId: empresa.id,
        nombre,
        correo,
        claveCifrada: hashClave,
      },
    });
    await prisma.usuarioRol.upsert({
      where: { usuarioId_rolId: { usuarioId: usuario.id, rolId: rol.id } },
      update: { empresaId: empresa.id },
      create: { empresaId: empresa.id, usuarioId: usuario.id, rolId: rol.id },
    });

    console.log(
      `Empresa preparada. Asigna EMPRESA_ID=${empresa.id} al backend y reinícialo.`,
    );
    console.log(`Usuario administrador preparado: ${usuario.correo}`);
  } finally {
    await prisma.$disconnect();
  }
}

bootstrap().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'No se pudo completar la configuración inicial.',
  );
  process.exitCode = 1;
});
