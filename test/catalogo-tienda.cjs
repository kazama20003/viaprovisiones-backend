require('dotenv/config');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {PrismaService}=require('../dist/src/compartido/infraestructura/prisma/prisma.service');
const {CatalogoTiendaController}=require('../dist/src/contextos/tienda/presentacion/catalogo-tienda.controller');
const prisma=new PrismaService(),rollback=Symbol('rollback'),old=process.env.EMPRESA_ID;
(async()=>{try{await prisma.$transaction(async tx=>{
 const empresa=await tx.empresa.create({data:{razonSocial:'Prueba catálogo',nombreComercial:'Prueba catálogo'}});process.env.EMPRESA_ID=empresa.id;
 const producto=await tx.producto.create({data:{empresaId:empresa.id,nombre:'Producto público',sku:'T-'+randomUUID().slice(0,8),estado:'publicado',visibleEnTienda:true}});
 const sinPrecio=await tx.producto.create({data:{empresaId:empresa.id,nombre:'Sin precio público',sku:'T-'+randomUUID().slice(0,8),estado:'publicado',visibleEnTienda:true}});
 const publico=await tx.listaPrecios.create({data:{empresaId:empresa.id,nombre:'Público'}}),mayorista=await tx.listaPrecios.create({data:{empresaId:empresa.id,nombre:'Mayorista'}});
 await tx.precioProducto.create({data:{listaPreciosId:publico.id,productoId:producto.id,precioUnitario:50}});await tx.precioProducto.create({data:{listaPreciosId:mayorista.id,productoId:producto.id,precioUnitario:10}});await tx.precioProducto.create({data:{listaPreciosId:mayorista.id,productoId:sinPrecio.id,precioUnitario:5}});
 const controller=new CatalogoTiendaController(tx),lista=await controller.listar();assert.equal(lista.datos.length,1);assert.equal(lista.datos[0].precio,50);const detalle=await controller.obtener(producto.id);assert.equal(detalle.datos.precios.length,1);assert.equal(detalle.datos.precios[0].precioUnitario,50);await assert.rejects(()=>controller.obtener(sinPrecio.id));
 console.log('Catálogo público: precio correcto y listas privadas protegidas.');throw rollback;
 },{timeout:30000})}catch(e){if(e!==rollback)throw e;console.log('Datos de prueba revertidos.')}finally{if(old===undefined)delete process.env.EMPRESA_ID;else process.env.EMPRESA_ID=old;await prisma.$disconnect()}})().catch(e=>{console.error(e);process.exitCode=1});
