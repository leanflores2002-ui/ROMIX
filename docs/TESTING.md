# Pruebas funcionales de ROMIX

Trabajo realizado en `develop`, sin commit, push, despliegue ni envíos reales.

## Ejecución

Usar Node 24 y las dependencias de `package-lock.json`. En PowerShell con políticas
restrictivas usar `npm.cmd` en lugar de `npm`.

- `npm test`: regenera las plantillas y ejecuta los 26 grupos JS. Conserva todos los
  grupos originales, continúa después de un fallo y termina con código distinto de
  cero si cualquiera falla. Cada proceso tiene un límite de dos minutos.
- `npm run test:regressions`: Analytics, precios compartidos y persistencia del carrito.
- `npm run test:browser`: Chromium, servidor estático en puerto efímero, comercio y
  menú. Requiere el navegador instalado de Playwright (`npx playwright install chromium`).
  No requiere iniciar el sitio por separado. `ROMIX_TEST_URL` permite usar otro servidor
  para el grupo de menú; por defecto todo es local.
- `npm run test:backend`: instalar `backend/requirements.txt`, `pytest` y `httpx` en
  un entorno virtual y activarlo. Ejecuta pedidos, visibilidad, compartir y SEO.
- `npm run check:ts`: comprobación de tipos.
- `npm run check:products`: validación de campos y referencias de imágenes, sin
  imponer una cantidad fija de productos.

Para evidencia visual, `ROMIX_SCREENSHOTS=1` guarda capturas de producto, carrito y
catálogo en el directorio temporal del sistema; también acepta un directorio existente.
Las capturas no se versionan. Los puertos y procesos de navegador se cierran incluso
si falla una aserción. No se agrega ejecución dinámica de texto a las pruebas nuevas.

No había `.github/workflows` versionado. Se agrega un único workflow para PR hacia
`develop` y ejecución manual: JS, tipos, backend y navegador. No cambia configuraciones
externas ni contiene despliegues. El fallo de un grupo no impide correr los otros.

## Cobertura funcional revisada

| Área | Existente reutilizada | Aporte nuevo |
| --- | --- | --- |
| Precios | Descuentos, originales, alias API y precios de variantes | Excepciones declaradas, grupos infantiles, precios no finitos, precio especial en compra real |
| Carrito | Mensaje de pedido y estabilidad | Combinar variantes iguales; separar producto/color/talle aunque llegue una clave falsa; modificar, eliminar y vaciar; cantidades inválidas; recuperar persistencia y JSON corrupto; fallar al guardar/migrar; cantidad incremental de Analytics |
| WhatsApp | Texto decodificado sin precios | Popup real interceptado; `opener=null`; validación de stock; vacío; bloqueo y excepción sin perder carrito; reintento |
| Compartir | Generación, hash de versión, seguridad y host de Preview | Texto completo en WhatsApp/correo/Telegram; payload nativo sin URL separada; capacidades; cancelación y error; Clipboard API y alternativa real `execCommand`; foco devuelto al copiar |
| Catálogo | Secciones, colores, filtros, ocultos, rutas, orden recomendado | Identificadores únicos sin cantidad fija; búsqueda con mayúsculas y sin acentos; combinación de sección/categoría/talle/color/precio; ordenar, cargar más y ocultos; teclado y recuperación de foco |
| Analytics | Formato Arguments que procesa gtag; una inicialización; URL/referrer sin parámetros privados; vistas sin duplicar; WhatsApp como consulta | Se integra al comando principal y se verifica cantidad recién agregada desde el carrito; localhost sin solicitudes a Google |
| SEO/medios | Sitemap, canonical, ocultos, categorías, Preview, referencias reales, dimensiones de derivados, plantillas | Se integra prueba de derivados al comando principal; imágenes visibles y ausencia de desbordamiento en producto/carrito/catálogo |
| API | Fixtures temporales; enteros positivos; suma de duplicados; atomicidad al rechazar; fallo de persistencia; concurrencia | Se reutilizan las 19 pruebas sin duplicarlas y se incorpora ejecución en CI |

Las pruebas JS mezclan unidades y comprobaciones de integración existentes. Las nuevas
de persistencia usan JSDOM con el archivo real, sin servidor ni código extraído por eval.
Las pruebas de navegador ejercitan DOM, eventos, foco y ventanas del navegador real.
Los adaptadores de compartir y portapapeles se instrumentan para observar payloads y
provocar errores; no equivalen a verificar el panel del sistema operativo.

## Defectos corregidos

1. El carrito convertía cero, negativos y fracciones en unidades válidas. Ahora
   rechaza valores que no sean enteros positivos seguros, conservando cadenas numéricas
   usadas por inputs. No se inventa un límite comercial de 99 o un stock inexistente.
2. Una clave recibida podía fusionar variantes diferentes. La identidad se calcula
   siempre a partir de producto, color y talle.
3. La migración borraba el carrito legado aunque fallara la escritura del nuevo.
   Se conserva el dato recuperable cuando falla la persistencia.
4. Dos colores con la misma imagen podían terminar como el primer color de la galería.
   Se conserva el color elegido al sincronizar galería y selectores; regresión en navegador.
5. Una excepción al abrir/navegar la ventana de WhatsApp dejaba el botón bloqueado.
   Ahora conserva el carrito, cierra la ventana incompleta si puede y permite reintentar.
6. Los precios no finitos podían publicarse en la tarjeta compartida. Se omiten.

Se editaron las plantillas de producto/carrito y se regeneraron sus salidas públicas.
El catálogo y el inventario reales no se modificaron.

## Resultados y pendientes (2026-10-15)

- Pasan las regresiones nuevas, tipos, plantillas, galería, mensaje de carrito,
  precios, filtros, rutas, medios, seguridad, SEO y categorías al ejecutarlos directamente.
- `npm.cmd test`: **25 de 26 grupos pasaron** en la corrida final completa, con
  salida 1 por `catalogSyncTests`. Esto cuenta grupos, no es un porcentaje de cobertura.
- `python -m pytest backend/tests/test_orders.py -q -p no:cacheprovider`: **19 passed**.
  Pasan también los tres scripts backend. Se usó `%TEMP%/romix-qa-venv`, porque el
  Python global no tenía FastAPI ni pytest. Hay advertencias de deprecación de
  TestClient/httpx y `on_event`; no se cambió el backend por ellas.
- `node scripts/check-products.js`: **169 productos y 849 imágenes principales
  validadas**, con 148 advertencias que requieren revisión separada.
- `node tests/commerceBrowserTests.js`: pasa a 1440 y 390 px. Producto → color →
  talle → carrito → cambiar cantidad → WhatsApp, compartir y filtros. Imágenes visibles,
  contenido inicial y desbordamiento se comprueban en las tres vistas. Los errores
  de ejecución se capturan. Las capturas se guardan fuera del repositorio.
  Se usó Playwright instalado porque el plugin Browser no estaba disponible.
- `node tests/megaMenuBrowserTests.js`: pasa en escritorio 1366/1440/1920 y móvil
  360/390/430/768, incluyendo Escape, navegación y vuelta atrás.
- Fallo conservado: `catalogSyncTests` exige 157 productos y hay 169. Además compara
  posiciones y hashes de una migración histórica. No se actualizó el snapshot sin
  evidencia de autorización de cada cambio; `npm test` y CI deben seguir marcando fallo.
- Fallo fuera de la suite principal: `node tests/buttonLabelTests.js` exige SVG
  inline en el HTML fuente y falla ante marcadores actuales `data-romix-icon`.
  Se conserva, sin debilitar expectativas. `romixIconButtonTests` sí pasa.

## Límites y casos todavía faltantes

- Chromium solamente: no se ejecutaron Safari, Firefox, dispositivos físicos ni
  paneles nativos de compartir del sistema. Clipboard API se instrumentó; el fallback
  ejecuta el comando real pero no lee el portapapeles del sistema.
- Se verifican ventanas reales de WhatsApp con destinos interceptados, sin enviar
  mensajes. El bloqueo se provoca devolviendo null y la excepción mediante SecurityError;
  no se cambió la configuración del bloqueador del navegador.
- La disponibilidad desconocida mantiene la consulta por WhatsApp existente. Los
  fallbacks de precios por grupo ausente requieren una política comercial explícita
  antes de cambiarlos. Faltan más fixtures de datos incompletos en la vista de producto.
- Se verifican filtros combinados, orden y carga incremental con fixtures. Quedan
  pendientes combinaciones exhaustivas y recorrido de teclado completo del menú.
- Analytics verifica comandos gtag y ausencia de solicitudes en localhost; no se
  envían eventos reales a Google ni se verifica su ingestión. Preview se prueba en
  unidad/integración, sin visitar una implementación remota.
- Las imágenes comprobadas en navegador pertenecen a fixtures locales; la auditoría
  del catálogo real comprueba archivos por separado. No se recorrieron todos los productos.
- El lock de pedidos protege hilos dentro de **un proceso**. No protege varios workers,
  procesos o instancias que escriban el mismo JSON. No se afirma atomicidad distribuida;
  para ello hace falta almacenamiento transaccional compartido.

Commit sugerido: `test: ampliar regresiones de comercio y automatizar QA en develop`.

## Archivos modificados

- Implementación: `frontend/public/assets/js/cart.js`, `scripts/share-prices.js`,
  `frontend/src/templates/{cart,product}.html` y sus dos salidas públicas.
- Pruebas nuevas: `tests/cartPersistenceTests.js`, `tests/commerceBrowserTests.js`,
  `tests/catalogIdentityTests.js` y `tests/helpers/browserServer.js`.
- Pruebas ampliadas: `tests/sharePriceTests.js`, `tests/analyticsTests.js`,
  `tests/megaMenuBrowserTests.js`.
- Ejecución/documentación: `scripts/test-suite.js`, `package.json`,
  `.github/workflows/tests.yml` y este documento.
