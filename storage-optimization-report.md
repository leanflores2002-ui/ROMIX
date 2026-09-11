# ROMIX: resultado de optimización de Deployment Storage

Rama local: `chore/reduce-vercel-deployment-storage`. Base: `6dd636b`.
Proyecto autorizado: `romix`, `prj_M0w3DNjknZtHROdmTwLWdWof1sG8`.
Equipo indicado por el usuario: `team_tTxFOPyDq9CInhLC0goE8fFm`.
No se modificó `romix-public`, otro repositorio, producción ni la retención de Vercel.

## Resultado medido

Se redujo `frontend/public` en **638.324.849 bytes (638,32 MB; 48,94%)**.
Se comprimieron **635 PNG y 3 MP4**, conservando rutas públicas y dimensiones.
No se eliminó ni agregó ningún asset al storefront. No cambiaron datos de productos, HTML, JS de runtime, backend, precios ni asociaciones color → imagen.

Unidades decimales: MB = 1.000.000 bytes; GB = 1.000.000.000 bytes.

| Alcance | Antes | Después |
| --- | ---: | ---: |
| Working tree comparable, archivos de la base | 1.304.474.504 B | 666.150.762 B |
| frontend/public | 1.304.286.106 B | 665.961.257 B |
| images | 1.285.366.845 B | 654.660.310 B |
| images/optimized | 672.100 B | 672.100 B |
| videos | 17.577.709 B | 9.959.395 B |
| Archivos comparables del repositorio | 4.139 | 4.139 |
| Archivos en frontend/public | 4.105 | 4.105 |
| node_modules local, no versionado | 41.019.038 B | 41.019.038 B |

El working tree comparable excluye Git, node_modules y los informes/herramientas nuevos de esta auditoría. Incluye los cambios en archivos ya existentes, por eso su ahorro difiere ligeramente del ahorro de media. Los informes no están dentro de public y están excluidos del upload mediante `.vercelignore` cuando esa configuración sea aplicable.

**Vercel Deployment Storage:** antes, 79,99 GB informados por el usuario; después, **sin nueva lectura disponible**. No se desplegó esta rama ni se borraron deployments: **ahorro realizado en la cuenta por esta intervención: 0 GB**. Si el output remoto coincide con `frontend/public`, los nuevos outputs tendrán aproximadamente 638 MB menos; no se verificó esa configuración remota y no se presenta como tamaño real de un deployment.

## Imágenes y calidad

Los PNG acumulaban 1.102.775.433 bytes. Se analizaron 677 PNG de al menos 400 KB con modo RGB/RGBA opaco. Se aceptaron 635 y se dejaron intactos 42 por calidad o ahorro insuficiente. Los PNG restantes, pequeños, transparentes o de otros modos, se conservaron.

Se utilizó pngquant 2.17.0, calidad perceptual mínima 85, objetivo 100, speed 3, más PSNR RGB mínimo de 38 dB y ahorro mínimo de 10%. Pillow 12.3.0 verificó dimensiones, decodificación y diferencias de píxeles. Se conservaron perfiles ICC cuando estaban presentes. Los candidatos se guardaron fuera de public; antes de reemplazar se verificaron todos los hashes de origen y destino. Los candidatos temporales y las dependencias de compresión fueron retirados al finalizar.

Se compararon visualmente cinco fotos grandes. El método preliminar de paleta de Pillow se descartó al observar bandas de color. Los archivos aplicados proceden del plan final pngquant, no de esa prueba. La revisión visual fue por muestras; no equivale a inspección humana individual de las 635 fotos.

Se mantuvo PNG en las URLs `.png` existentes para conservar compatibilidad con carrito, datos y consumidores externos. No se sirvieron bytes WebP con extensión/MIME PNG. Las variantes WebP/AVIF existentes siguen disponibles. Alcanzar 70–90% de ahorro total exigiría retirar o externalizar originales/fallbacks con un mapeo de URLs y configuración remota verificados; no se sacrificó calidad ni compatibilidad para llegar a ese porcentaje.

Los banners usados por el navegador ya están en WebP: 96.488, 83.206 y 120.684 bytes. `images/optimized` solo ocupa 672 KB y sí tiene referencias en `picture/srcset`; no era el origen principal del peso. Se conservaron esas variantes.

No hubo duplicados byte por byte entre imágenes/videos reales. El único duplicado detectado al incluir todos los archivos fue un `.gitkeep` de 1 byte. No se hizo una eliminación simbólica de ese archivo. Las variantes de distinto formato tienen bytes diferentes y usos/fallbacks dinámicos; no se trataron como duplicados eliminables.

## Videos

H.264 CRF 27, preset medium, yuv420p, AAC 128k y faststart. Sin reducción de resolución. Se decodificó completamente cada candidato.

| Video | Antes | Después | SSIM frente a main |
| --- | ---: | ---: | ---: |
| video1.mp4 | 3.880.383 B | 1.539.022 B | 0,975073 |
| video2.mp4 | 2.458.547 B | 2.070.200 B | 0,991590 |
| video3.mp4 | 4.079.416 B | 4.079.416 B | Sin reemplazo |
| video4.mp4 | 7.159.362 B | 2.270.756 B | 0,979984 |

Ahorro: 7.618.314 bytes, 43,34%. El video 3 no mejoraba suficientemente; se conservó. Se generaron comparaciones de fotogramas y se revisó visualmente una muestra.

## Output, build y prevención

La configuración versionada existente es `netlify.toml`: ejecuta `node scripts/generate-share-pages.js` y publica `frontend/public`. No había `vercel.json`, `.vercel/project.json` ni `frontend/admin`/Vite en este checkout. No se encontraron dist/build, node_modules ni source maps versionados para retirar. Las dependencias declaradas jsdom y axe-core son utilizadas por tests; no se eliminaron.

**No fue posible determinar exactamente qué incluye el deployment remoto de romix.** La consulta al conector devolvió `Unknown tool` para get_project y list_deployments; el acceso anterior por slug devolvía 403. Tampoco hay VERCEL_TOKEN configurado. No se inventaron Root Directory, Output Directory, build command, ignores, rewrites, tamaños remotos ni candidatos.

`.vercelignore` excluye Git, node_modules locales, docs, tests, informes y artefactos de esta auditoría. Mantiene backend y scripts de build ante la configuración remota desconocida. Esto controla uploads donde Vercel aplique este archivo; no demuestra ni sustituye una configuración correcta de Output Directory.

`scripts/ignore-vercel-build.js` está preparado pero **no activado** en Vercel. Solo salta un build cuando todo el diff son docs, tests o los informes before/after; ante SHA ausente, error o cambio desconocido devuelve 1 para construir. Se verificó ese comportamiento conservador. Su activación requiere verificar primero la configuración remota.

`scripts/generate-images.js` ahora hace dry run por defecto y deduplica fuentes por nombre base, prefiriendo PNG sobre una copia WebP. Solo genera WebP thumbnail con `--write`; AVIF y mobile requieren `--avif` / `--mobile`. En dry run identificó 801 fuentes únicas y 5 thumbnails pendientes antes de comprimir. No generó archivos nuevos. No se añadió al build ni se ejecutó con `--write`.

No se descargó media remota ni se modificó Supabase. `romix-image-utils.js` y `products-store.js` se revisaron y permanecen sin cambios. Hay lógica previa que deriva thumbnails artificiales y puede afectar URLs remotas: queda pendiente corregirla con pruebas específicas de URLs firmadas y existencia de archivos; no se presenta como resuelta por esta compresión.

## Retención e historial

La métrica investigada es [Deployment Storage](https://vercel.com/docs/deployment-storage): outputs/assets retenidos. Git, Functions Storage, Blob, Data Cache, Build Cache y logs son alcances diferentes y no se sumaron a los 79,99 GB.

Entre el 20 de agosto y el 11 de septiembre, el historial local de main contiene 59 commits: 50 del usuario y 9 de github-actions[bot]. Hay concentración el 27–31 de agosto, consistente temporalmente con el crecimiento comunicado. **Un commit no prueba que se haya creado un deployment**, ni demuestra un bucle. No hay workflows actuales en este checkout ni scripts actuales con git commit/push que permitan confirmar un loop activo.

`vercel-deployment-cleanup-plan.json` tiene estado BLOCKED_NO_REMOTE_INVENTORY, lista vacía y cantidad candidata null. Esto significa no auditado, no cero candidatos. La propuesta conserva producción actual, tres producciones recientes útiles y previews activos; revisa cancelados/antiguos. No incluye ninguna operación DELETE.

`scripts/audit-vercel-deployments.js` usa exclusivamente GET, equipo/proyecto fijos, token por entorno y paginación. Guarda un inventario conservador cuando haya acceso. Sin token termina sin alterar el plan existente. Las ramas cuya relevancia se desconoce quedan en REVIEW; no se asumen cerradas. No hay herramienta de borrado en esta rama.

Git local ocupaba 2.945.824.877 bytes y, después del commit de media, 3.357.701.082 bytes. Creció porque conserva originales históricos y versiones comprimidas; **no se afirma ahorro de historial Git**. No se ejecutaron filter-repo, BFG, force push ni limpieza de objetos. Los 200 blobs históricos más pesados y los commits del período están en `storage-git-history.json`.

## QA

Entorno: Chromium con Playwright local, `http://127.0.0.1:8765`, servidor estático Python. Viewports 390×844, 768×1024 y 1440×900. Browser plugin not available; se utilizó Playwright instalado en el workspace.

Flujo: Home → búsqueda/menú → producto real → tres colores con imágenes diferentes → talle → agregar al carrito → contenido del carrito. Pasó en los tres viewports, antes y después.

| Verificación | Resultado |
| --- | --- |
| `/`, index, catálogo, mujer, hombre, niños, novedades, product y cart | 27 comprobaciones antes + 27 después |
| Pantallas no vacías / sin overflow horizontal | Pasó |
| Errores JS nuevos | 0 |
| Nuevas respuestas fallidas / imágenes visibles rotas | 0 |
| Aumento de incidencias axe serias/críticas respecto de baseline | 0 |
| Búsqueda, menú, colores, talle y carrito del producto de muestra | Pasó en 3 viewports |
| Integridad de todos los assets inventariados | 4.093 verificados; 638 cambios esperados; 0 borrados; 0 añadidos; 0 errores |
| Suite npm test | Pasó antes y después |
| imageUtilsTests adicional | Pasó |
| Decodificación y SSIM de videos modificados | Pasó |

La suite npm incluye pageTests, salePricingTests, cartOrderTests, colorNameTests, seasonVisibilityTests, recommendedOrderTests, storefrontStabilityTests y sharePreviewTests. cartOrderTests requiere un servidor en localhost:80; el primer intento sin ese servidor falló y la repetición con el servidor pasó. No se modificó la tienda para ocultar ese fallo de entorno.

Limitaciones previas: `/api/products` y `/api/variants` responden 404 en el servidor estático; el catálogo usa su fallback local. En Niños existen cuatro solicitudes a `top_lycra_nena_{violeta,rosa,lila,negra}-thumb.webp` que responden 404 y activan fallback. Axe detecta problemas serios previos de contraste y aria-hidden-focus; no se incrementaron. No se validaron respuestas reales de Render/Supabase, todos los productos interactuando individualmente, Safari/Firefox ni un deployment de preview en Vercel. El flujo de WhatsApp se verificó mediante los tests existentes, sin enviar mensajes.

## Artefactos y reproducción

- `storage-audit-before.json/.txt`, `storage-audit-after.json/.txt`: tamaños, top 200 archivos, top 50 carpetas, umbrales 1/5/10/50 MB, referencias, SHA-256 y clasificación conservadora.
- `media-optimization-plan.json` y `media-optimization-result.json`: lista exacta de cada PNG evaluado/reemplazado, tamaños, hashes, calidad y dimensiones.
- `media-video-dry-run.json`, `media-video-plan.json`, `storage-video-quality.json`: plan y resultado de videos.
- `storage-browser-before.json`, `storage-browser-after.json`, `storage-browser-comparison.json`: QA por página/viewport.
- `storage-interactions-before.json`, `storage-interactions-after.json`, `storage-verification.json`: pruebas de comportamiento e integridad.
- `storage-before-*.png`, `storage-after-*.png`, `storage-product-*.png`, `storage-quality-*.png`: evidencia visual local, ignorada por Git y excluida de Vercel.

Auditar: `node scripts/audit-storage.js before` / `after`. No sobrescribir el baseline guardado de esta intervención si se quiere conservar la comparación histórica.

Duplicados: `node scripts/find-duplicate-assets.js`.

Para una nueva compresión, instalar Pillow e imageio-ffmpeg en un entorno temporal y disponer de pngquant en PATH o PNGQUANT_BINARY. La ejecución usó Pillow 12.3.0, imageio-ffmpeg 0.6.0 y pngquant-bin 9.0.0 (binario Windows 2.17.0). Ejecutar `python scripts/optimize-static-media.py` para dry run y después `--execute`; para MP4, `python scripts/optimize-videos.py`, después `--execute`. No se recomienda recomprimir repetidamente los mismos archivos con pérdida. Las herramientas temporales de esta intervención ya se retiraron.

Pruebas: servidores Python en localhost:80 y 127.0.0.1:8765 con directorio frontend/public; `npm.cmd test`; `node scripts/storage-browser-check.js after`; `node scripts/storage-interactions.js after`; `node scripts/compare-storage-browser.js`; `node scripts/verify-storage-change.js`.

Pendiente de acceso a Vercel: inventario real, configuración de output/retención, correlación del salto de agosto/septiembre, preview de validación y plan con IDs candidatos. Cualquier limpieza destructiva de Vercel requiere aprobación posterior del usuario. No se hizo push, merge ni borrado de deployments.
