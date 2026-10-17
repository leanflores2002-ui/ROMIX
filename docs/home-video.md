# Video principal de ROMIX

El original permanece en `frontend/public/videos/Athletes_training_in_industrial_gym_romix.mp4` (1280x720, 10 segundos, 4.271.748 bytes). La web sirve exclusivamente las versiones sin audio: `romix-principal.mp4` (1.706.931 bytes) y `romix-principal-mobile.mp4` (630.174 bytes). Se elige una sola según el ancho inicial, sin descargar ambos videos. El archivo móvil conserva el encuadre 16:9: no se recorta a vertical.

Las portadas WebP (42.740/24.900 bytes) son responsive y sirven como respaldo sin JavaScript, durante la carga o si el video falla. La composición mantiene la imagen completa, admitiendo bandas laterales si la altura disponible limita el escenario.

Orden: video, nuevos lanzamientos y carrusel promocional. El resto de las secciones permanece. El carrusel deja de tener prioridad de descarga.

El video se inicia sin sonido y en bucle después de cargar la página, con control de reproducción/pausa. Se pausa fuera de pantalla o en una pestaña oculta. Si el usuario pide reducir movimiento o ahorrar datos, no se descarga automáticamente; puede reproducirlo manualmente. El bloqueo de autoplay mantiene la portada y el botón de reproducción. Los videos derivados no incluyen pista de audio.

Para regenerar después de reemplazar el original, instalar FFmpeg con H.264 disponible, ponerlo en PATH o definir FFMPEG_PATH con la ruta del ejecutable y ejecutar `npm run optimize:home-video`. FFmpeg no es necesario para desplegar: los archivos derivados se versionan. No se agregó una dependencia de FFmpeg al proyecto.

Pruebas: `npm run test:home-video`, incluidas en `npm run test:browser`. Cubren selección móvil/escritorio, reproducción, pausa, salida de pantalla, menor movimiento, ahorro de datos, error de carga, accesibilidad y ausencia de desbordamiento. Los destinos externos se interceptan. Las pruebas locales no certifican el rendimiento del despliegue real.
