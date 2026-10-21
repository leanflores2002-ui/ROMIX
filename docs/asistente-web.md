# Asistente de catálogo ROMIX

Implementado en develop, sin publicación automática. Es un buscador conversacional local con reglas, no un modelo de IA generativa. Busca nombres, categorías, talles y colores con normalización de acentos, aliases y tolerancia de una edición en palabras largas. No comprende cualquier mensaje ni interpreta imágenes.

El catálogo auxiliar se regenera con sync:shells/build desde productos públicos, enlaces canónicos y sharePrices (incluye precios por grupo). No expone productos ocultos. Los resultados son opciones publicadas, nunca garantía de stock o de una combinación. No confirma pedidos ni pagos, no modifica el carrito.

Carga los datos al enviar la primera consulta; conversaciones solo en memoria de la pestaña, sin almacenamiento ni eventos de Analytics ni proveedor externo. No enviar datos personales. El enlace a WhatsApp es fijo y no incluye la conversación.

Integración compartida en footer, también en páginas generadas. Escape cierra, vuelve el foco al botón, estados accesibles y controles táctiles. Se oculta mientras el banner inicial de cookies está visible para evitar superposición.

QA: Browser plugin no disponible; usar Playwright Chromium en 390 y 1440 px. Revisar búsqueda, ficha, error de carga, cierre y foco, cookies y desbordamiento. Firefox y Safari pendientes.

## Validación realizada

31 grupos comprobados: 29 aprobaron en la ejecución general y los dos fallos (orden de estilos y fichas generadas desactualizadas durante el ajuste) quedaron corregidos y aprobaron al repetirlos. También pasaron plantillas y TypeScript. test:assistant aprobó búsqueda, precios/talles/colores, enlaces, Escape y retorno de foco, ausencia de desbordamiento y fallo de carga a 390 y 1440 px. Capturas en reports/assistant-390.png y reports/assistant-1440.png. Sin telemetría real ni mensajes externos. No publicado.

