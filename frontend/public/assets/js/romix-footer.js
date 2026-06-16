(function () {
  var footerHtml = [
    '<div class="footer-shell">',
    '  <div class="footer-top">',
    '    <div class="footer-brand">',
    '      <a href="index.html" class="footer-logo" aria-label="ROMIX">',
    '        <img src="images/logo-romix.png" alt="ROMIX" />',
    '        <div class="footer-logo-copy">',
    '          <strong>ROMIX</strong>',
    '          <span>Sportswear &amp; Fashion</span>',
    '        </div>',
    '      </a>',
    '      <p class="footer-description">',
    '        Rendimiento que inspira. Estilo que te acompa&ntilde;a.<br />',
    '        Ropa deportiva y urbana para cada versi&oacute;n de ti.',
    '      </p>',
    '      <div class="footer-contact" aria-label="Contacto ROMIX">',
    '        <a class="footer-contact-item footer-contact-item--link" href="https://wa.me/5491154272065" target="_blank" rel="noopener" aria-label="WhatsApp ROMIX">',
    '          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">',
    '            <path d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38L15.41 15.18C15.68 14.91 16.08 14.82 16.43 14.94C17.55 15.31 18.75 15.5 20 15.5C20.55 15.5 21 15.95 21 16.5V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.69 6.45 9.06 7.57C9.18 7.92 9.09 8.32 8.82 8.59L6.62 10.79Z" fill="currentColor"></path>',
    '          </svg>',
    '          <span>+54 9 11 5427-2065</span>',
    '        </a>',
    '        <span class="footer-contact-divider" aria-hidden="true"></span>',
    '        <span class="footer-contact-item">',
    '          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">',
    '            <path d="M12 21C16.5 16.8 19 13.14 19 9.5C19 5.91 15.87 3 12 3C8.13 3 5 5.91 5 9.5C5 13.14 7.5 16.8 12 21Z" stroke="currentColor" stroke-width="1.8"></path>',
    '            <circle cx="12" cy="9.5" r="2.5" fill="currentColor"></circle>',
    '          </svg>',
    '          <span>CABA, Argentina</span>',
    '        </span>',
    '      </div>',
    '    </div>',
    '',
    '    <nav class="footer-column" aria-label="Comprar">',
    '      <h4>Comprar</h4>',
    '      <ul>',
    '        <li><a href="mujer.html">Mujer</a></li>',
    '        <li><a href="hombre.html">Hombre</a></li>',
    '        <li><a href="ninos.html">Ni&ntilde;os</a></li>',
    '        <li><a href="novedades.html">Novedades</a></li>',
    '        <li><a href="index.html#ofertas">Ofertas</a></li>',
    '      </ul>',
    '    </nav>',
    '',
    '    <nav class="footer-column" aria-label="Categoria">',
    '      <h4>Categor&iacute;a</h4>',
    '      <ul>',
    '        <li><a href="catalogo.html?categories=calzas">Calzas</a></li>',
    '        <li><a href="catalogo.html?categories=remeras">Remeras</a></li>',
    '        <li><a href="catalogo.html?categories=pantalones">Pantalones</a></li>',
    '        <li><a href="catalogo.html?categories=camperas">Camperas</a></li>',
    '        <li><a href="catalogo.html?categories=tops">Tops</a></li>',
    '        <li><a href="catalogo.html?categories=buzos">Buzos</a></li>',
    '      </ul>',
    '    </nav>',
    '',
    '    <nav class="footer-column" aria-label="Ayuda">',
    '      <h4>Ayuda</h4>',
    '      <ul>',
    '        <li><a href="ayuda.html#size-guide">Preguntas frecuentes</a></li>',
    '        <li><a href="ayuda.html#returns">Env&iacute;os y devoluciones</a></li>',
    '        <li><a href="ayuda.html#returns">Cambios</a></li>',
    '        <li><a href="cart.html#order-btn">Formas de pago</a></li>',
    '        <li><a href="ayuda.html#contact">Contacto</a></li>',
    '      </ul>',
    '    </nav>',
    '  </div>',
    '',
    '  <div class="footer-bottom">',
    '    <p>&copy; 2026 ROMIX. Indumentaria deportiva, invernal y urbana.</p>',
    '    <div class="footer-socials" aria-label="Redes sociales">',
    '      <a href="https://www.instagram.com/romixdamasalbertina/" target="_blank" rel="noopener" aria-label="Instagram">',
    '        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">',
    '          <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="2"></rect>',
    '          <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"></circle>',
    '          <circle cx="17.5" cy="6.5" r="1" fill="currentColor"></circle>',
    '        </svg>',
    '      </a>',
    '      <a href="https://www.facebook.com/p/ROMIX-concordia-514-100040099371330/" target="_blank" rel="noopener" aria-label="Facebook">',
    '        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">',
    '          <path d="M13.5 21V13H16.2L16.6 9.9H13.5V8.1C13.5 7.21 13.76 6.6 15.04 6.6H16.7V3.82C16.39 3.78 15.31 3.68 14.05 3.68C11.42 3.68 9.62 5.28 9.62 8.24V9.9H7V13H9.62V21H13.5Z" fill="currentColor"></path>',
    '        </svg>',
    '      </a>',
    '      <a href="https://www.tiktok.com/@romix_tienda?_r=1&_t=ZS-97FOkImZhLN" target="_blank" rel="noopener" aria-label="TikTok">',
    '        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">',
    '          <path d="M19.59 6.69A4.83 4.83 0 0 1 15.82 2.44V2H12.37V15.67A2.89 2.89 0 0 1 9.49 18.17A2.89 2.89 0 0 1 6.6 15.28A2.89 2.89 0 0 1 9.49 12.39C9.77 12.39 10.03 12.43 10.28 12.49V9.01A6.33 6.33 0 0 0 9.49 8.96A6.34 6.34 0 0 0 3.15 15.3A6.34 6.34 0 0 0 9.49 21.64A6.34 6.34 0 0 0 15.82 15.3V8.95A8.24 8.24 0 0 0 20.64 10.49V7.04A4.85 4.85 0 0 1 19.59 6.69Z" fill="currentColor"></path>',
    '        </svg>',
    '      </a>',
    '      <a href="https://wa.me/5491154272065" target="_blank" rel="noopener" aria-label="WhatsApp">',
    '        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">',
    '          <path d="M20 11.56C20 16 16.41 19.6 12 19.6C10.58 19.6 9.24 19.23 8.08 18.57L4 20L5.47 16.07C4.73 14.86 4.3 13.44 4.3 11.92C4.3 7.48 7.89 3.88 12.3 3.88C16.71 3.88 20.3 7.48 20.3 11.92L20 11.56Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path>',
    '          <path d="M9.29 8.96C9.49 8.52 9.7 8.51 10.06 8.49C10.22 8.48 10.39 8.48 10.55 8.49C10.73 8.49 11.02 8.42 11.28 9.04C11.54 9.66 12.16 11.12 12.23 11.25C12.31 11.38 12.36 11.53 12.26 11.71C12.17 11.89 12.13 11.99 11.99 12.16C11.85 12.33 11.69 12.53 11.57 12.66C11.44 12.8 11.31 12.95 11.5 13.27C11.68 13.59 12.32 14.61 13.25 15.44C14.45 16.51 15.46 16.84 15.81 16.98C16.17 17.12 16.37 17.1 16.54 16.91C16.71 16.71 17.26 16.06 17.47 15.75C17.68 15.44 17.89 15.49 18.19 15.6C18.49 15.7 20.06 16.47 20.39 16.64C20.71 16.81 20.93 16.89 21.01 17.03C21.09 17.17 21.09 17.84 20.87 18.49C20.65 19.14 19.57 19.75 18.93 19.84C18.29 19.93 17.49 19.97 14.87 18.89C12.24 17.81 10.57 16.08 9.43 14.47C8.29 12.86 7.52 11.02 7.39 10.21C7.26 9.4 7.58 8.85 7.97 8.46C8.35 8.08 8.69 8.03 8.92 8.03C9.15 8.03 9.29 8.04 9.29 8.96Z" fill="currentColor"></path>',
    '        </svg>',
    '      </a>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join("\n");

  function mountFooter() {
    if (!document.body) return;

    Array.prototype.slice.call(document.body.children).forEach(function (node) {
      if (node.tagName && node.tagName.toLowerCase() === "footer") {
        node.parentNode.removeChild(node);
      }
    });

    var footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = footerHtml;

    var main = document.querySelector("main");
    if (main && main.parentNode === document.body) {
      main.insertAdjacentElement("afterend", footer);
      return;
    }

    var firstScript = Array.prototype.slice.call(document.body.children).find(function (node) {
      return node.tagName && node.tagName.toLowerCase() === "script";
    });

    if (firstScript) {
      document.body.insertBefore(footer, firstScript);
    } else {
      document.body.appendChild(footer);
    }
  }

  if (document.body) {
    mountFooter();
  } else {
    document.addEventListener("DOMContentLoaded", mountFooter);
  }
})();
