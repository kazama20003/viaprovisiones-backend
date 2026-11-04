require('dotenv/config');
const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const {PrismaService}=require('../dist/src/compartido/infraestructura/prisma/prisma.service');const {MostradorController}=require('../dist/src/contextos/ventas/presentacion/mostrador.controller');
const prisma=new PrismaService(),rollback=Symbol('rollback');
(async()=>{try{await prisma.$transaction(async tx=>{
 const company=await tx.empresa.create({data:{razonSocial:'Ventas prueba',nombreComercial:'Ventas prueba'}}),user=await tx.usuario.create({data:{empresaId:company.id,nombre:'Prueba',correo:randomUUID()+'@test.invalid',claveCifrada:'prueba'}}),almacen=await tx.almacen.create({data:{empresaId:company.id,codigo:'TEST',nombre:'Almacén temporal'}}),product=await tx.producto.create({data:{empresaId:company.id,nombre:'Producto temporal',sku:'P-'+randomUUID().slice(0,8),estado:'publicado'}}),lista=await tx.listaPrecios.create({data:{empresaId:company.id,nombre:'Público'}});
 await tx.precioProducto.create({data:{listaPreciosId:lista.id,productoId:product.id,precioUnitario:11.8}});
 for(const [codigo,cantidad,fecha] of [['A',2,'2026-01-01'],['B',4,'2026-01-02']]){const lote=await tx.lote.create({data:{empresaId:company.id,productoId:product.id,codigo,fechaIngreso:new Date(fecha),costoUnitario:4}});await tx.existenciaLote.create({data:{empresaId:company.id,loteId:lote.id,almacenId:almacen.id,cantidadFisica:cantidad}})}
 const proxy=new Proxy(tx,{get(target,key){if(key==='$transaction')return async f=>f(tx);return Reflect.get(target,key)}}),c=new MostradorController(proxy),s={empresaId:company.id,usuarioId:user.id};
 const caja=(await c.abrir(s,{almacenId:almacen.id,montoApertura:10})).datos;
 const catalogo=await c.catalogo(s,almacen.id);assert.equal(catalogo.datos[0].stock,6);
 const request={cajaId:caja.id,claveIdempotencia:randomUUID(),lineas:[{productoId:product.id,varianteId:null,cantidad:3,precioEsperado:11.8}],medioPago:'Efectivo',recibido:40};
 const first=await c.vender(s,request),again=await c.vender(s,request);assert.equal(first.datos.total,35.4);assert.equal(again.datos.id,first.datos.id);assert.equal(again.datos.repetida,true);
 const stocks=await tx.existenciaLote.findMany({where:{empresaId:company.id},include:{lote:true},orderBy:{lote:{codigo:'asc'}}});assert.deepEqual(stocks.map(x=>Number(x.cantidadFisica)),[0,3]);
 assert.equal(await tx.movimientoInventario.count({where:{empresaId:company.id,pedidoId:first.datos.id}}),2);assert.equal((await tx.pedido.findUniqueOrThrow({where:{id:first.datos.id}})).documentoTipo,'nota_interna');
 await tx.$executeRawUnsafe('SAVEPOINT prueba_sin_stock');await assert.rejects(()=>c.vender(s,{...request,claveIdempotencia:randomUUID(),lineas:[{...request.lineas[0],cantidad:10}],recibido:200}));await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT prueba_sin_stock');assert.equal(await tx.pedido.count({where:{empresaId:company.id}}),1);
 await assert.rejects(()=>c.vender(s,{...request,claveIdempotencia:randomUUID(),medioPago:'Yape',referencia:''}));
 const cierre=await c.cerrar(s,caja.id,{montoContado:45.4});assert.equal(cierre.datos.esperado,45.4);assert.equal(cierre.datos.diferencia,0);
 console.log('Venta, idempotencia, PEPS, stock insuficiente y cierre de caja verificados.');throw rollback;
 },{timeout:30000})}catch(e){if(e!==rollback)throw e;console.log('Datos temporales revertidos.')}finally{await prisma.$disconnect()}})().catch(e=>{console.error(e);process.exitCode=1});

