(function () {
  const BRAND_LOGO_PICTURE = '' +
    '<picture class="brand-logo-media">' +
      '<source srcset="images/optimized/logo-romix-240.webp 240w, images/optimized/logo-romix-480.webp 480w" sizes="(max-width: 640px) 88px, 120px" type="image/webp">' +
      '<img src="images/logo-romix.png" alt="Logo ROMIX" width="752" height="829" decoding="async" />' +
    '</picture>';

  var imageUtils = window.romixImageUtils || {};

  function normalizeText(value) {
    var raw = value == null ? "" : String(value).trim().toLowerCase();
    if (!raw) return "";
    try {
      return raw.normalize("NFD").replace(/\p{Diacritic}+/gu, "");
    } catch (_error) {
      return raw;
    }
  }

  function normalizeSection(value) {
    var key = normalizeText(value);
    if (["mujer", "mujeres", "dama", "damas"].indexOf(key) >= 0) return "mujer";
    if (["hombre", "hombres", "caballero", "caballeros"].indexOf(key) >= 0) return "hombre";
    if (["ninos", "ninas", "nino", "nina"].indexOf(key) >= 0) return "ninos";
    if (key === "novedades") return "novedades";
    return "";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildHref(page, params) {
    var search = new URLSearchParams();
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (value == null) return;
      if (Array.isArray(value)) {
        var cleanList = value.filter(function (entry) {
          return entry != null && String(entry).trim() !== "";
        });
        if (cleanList.length) search.set(key, cleanList.join(","));
        return;
      }
      var text = String(value).trim();
      if (!text) return;
      search.set(key, text);
    });
    var query = search.toString();
    return page + (query ? "?" + query : "");
  }

  function buildMenuConfig() {
    var mujer = "mujer.html";
    var hombre = "hombre.html";
    var ninos = "ninos.html";
    var novedades = "novedades.html";
    var catalogo = "catalogo.html";

    return [
      {
        key: "mujer",
        label: "Mujer",
        page: mujer,
        promo: {
          eyebrow: "Nueva coleccion",
          title: "Tu mejor version",
          cta: "Ver productos",
          href: buildHref(mujer, { temporada: "invierno" }),
          image: "images/products/campera_lycra_fucsia.png",
          alt: "Campera deportiva ROMIX para mujer"
        },
        columns: [
          {
            title: "Destacados",
            links: [
              { label: "Nuevos ingresos", href: buildHref(mujer, { q: "nuevo" }) },
              { label: "Mas vendidos", href: buildHref(mujer, { q: "mas vendido" }) },
              { label: "Temporada invierno", href: buildHref(mujer, { temporada: "invierno" }) },
              { label: "Termicos", href: buildHref(mujer, { q: "termica" }) }
            ]
          },
          {
            title: "Parte superior",
            links: [
              { label: "Remeras", href: buildHref(mujer, { tipo: "remeras" }) },
              { label: "Remeras manga larga", href: buildHref(mujer, { tipo: "remeras", q_any: "manga larga,remera" }) },
              { label: "Tops", href: buildHref(mujer, { tipo: "tops" }) },
              { label: "Buzos", href: buildHref(mujer, { tipo: "buzos" }) },
              { label: "Camperas", href: buildHref(mujer, { tipo: "camperas" }) },
              { label: "Camisetas termicas", href: buildHref(mujer, { tipo: "remeras", q: "termica" }) }
            ]
          },
          {
            title: "Parte inferior",
            links: [
              { label: "Calzas", href: buildHref(mujer, { tipo: "calzas" }) },
              { label: "Joggers", href: buildHref(mujer, { tipo: "pantalones", q: "jogger" }) },
              { label: "Babuchas", href: buildHref(mujer, { tipo: "pantalones", q: "babucha" }) },
              { label: "Rectos", href: buildHref(mujer, { tipo: "pantalones", q: "recto" }) },
              { label: "Oxford", href: buildHref(mujer, { tipo: "calzas", q: "oxford" }) },
              { label: "Palazos", href: buildHref(mujer, { q: "palazo" }) }
            ]
          },
          {
            title: "Colecciones",
            links: [
              { label: "Lycra", href: buildHref(mujer, { q: "lycra" }) },
              { label: "Termica", href: buildHref(mujer, { q: "termica" }) },
              { label: "Algodon", href: buildHref(mujer, { q: "algodon" }) },
              { label: "Modal", href: buildHref(mujer, { q: "modal" }) },
              { label: "Saplex", href: buildHref(mujer, { q: "saplex" }) },
              { label: "Polar y corderito", href: buildHref(mujer, { q_any: "polar,corderito" }) }
            ]
          },
          {
            title: "Accesorios",
            links: [
              { label: "Cuellos", href: buildHref(mujer, { tipo: "accesorios", q: "cuello" }) }
            ]
          }
        ]
      },
      {
        key: "hombre",
        label: "Hombre",
        page: hombre,
        promo: {
          eyebrow: "Nueva coleccion",
          title: "Listo para el frio",
          cta: "Ver productos",
          href: buildHref(hombre, { temporada: "invierno" }),
          image: "images/products/campera_algodon_frizado_hombre_azul_marino.png",
          alt: "Campera ROMIX para hombre"
        },
        columns: [
          {
            title: "Destacados",
            links: [
              { label: "Nuevos ingresos", href: buildHref(hombre, { q: "nuevo" }) },
              { label: "Mas vendidos", href: buildHref(hombre, { q: "mas vendido" }) },
              { label: "Abrigo", href: buildHref(hombre, { q_any: "campera,buzo,frizado,corderito,polar" }) },
              { label: "Termicos", href: buildHref(hombre, { q: "termica" }) }
            ]
          },
          {
            title: "Parte superior",
            links: [
              { label: "Remeras", href: buildHref(hombre, { tipo: "remeras" }) },
              { label: "Camisetas termicas", href: buildHref(hombre, { tipo: "remeras", q: "termica" }) },
              { label: "Buzos", href: buildHref(hombre, { tipo: "buzos" }) },
              { label: "Camperas", href: buildHref(hombre, { tipo: "camperas" }) }
            ]
          },
          {
            title: "Parte inferior",
            links: [
              { label: "Pantalones", href: buildHref(hombre, { tipo: "pantalones" }) },
              { label: "Babuchas", href: buildHref(hombre, { tipo: "pantalones", q: "babucha" }) },
              { label: "Joggers", href: buildHref(hombre, { tipo: "pantalones", q: "jogger" }) },
              { label: "Termicos", href: buildHref(hombre, { tipo: "pantalones", q: "termica" }) },
              { label: "Frizados", href: buildHref(hombre, { tipo: "pantalones", q: "frizado" }) }
            ]
          },
          {
            title: "Colecciones",
            links: [
              { label: "Algodon", href: buildHref(hombre, { q: "algodon" }) },
              { label: "Lycra", href: buildHref(hombre, { q: "lycra" }) },
              { label: "Frizado", href: buildHref(hombre, { q: "frizado" }) },
              { label: "Termica", href: buildHref(hombre, { q: "termica" }) },
              { label: "Corderito", href: buildHref(hombre, { q: "corderito" }) }
            ]
          },
          {
            title: "Accesorios",
            links: [
              { label: "Cuellos", href: buildHref(hombre, { tipo: "accesorios", q: "cuello" }) }
            ]
          }
        ]
      },
      {
        key: "ninos",
        label: "Niños",
        page: ninos,
        promo: {
          eyebrow: "Nueva coleccion",
          title: "Movimiento para todo el dia",
          cta: "Ver productos",
          href: buildHref(ninos, { temporada: "invierno" }),
          image: "images/products/campera_frizada_algodon_nino_azul_marino.png",
          alt: "Campera infantil ROMIX"
        },
        columns: [
          {
            title: "Niñas",
            links: [
              { label: "Calzas", href: buildHref(ninos, { tipo: "calzas", q_any: "nina,nena" }) },
              { label: "Remeras", href: buildHref(ninos, { tipo: "remeras", q_any: "nina,nena" }) },
              { label: "Camisetas termicas", href: buildHref(ninos, { tipo: "remeras", q_any: "nina,nena,termica" }) },
              { label: "Camperas", href: buildHref(ninos, { tipo: "camperas", q_any: "nina,nena" }) },
              { label: "Abrigo", href: buildHref(ninos, { q_any: "nina,nena,campera,frizada,termica" }) }
            ]
          },
          {
            title: "Niños",
            links: [
              { label: "Pantalones", href: buildHref(ninos, { tipo: "pantalones", q_any: "nino,chico" }) },
              { label: "Remeras", href: buildHref(ninos, { tipo: "remeras", q_any: "nino,chico" }) },
              { label: "Camisetas termicas", href: buildHref(ninos, { tipo: "remeras", q_any: "nino,chico,termica" }) },
              { label: "Camperas", href: buildHref(ninos, { tipo: "camperas", q_any: "nino,chico" }) },
              { label: "Abrigo", href: buildHref(ninos, { q_any: "nino,chico,campera,frizada,termica" }) }
            ]
          },
          {
            title: "Categorias",
            links: [
              { label: "Calzas", href: buildHref(ninos, { tipo: "calzas" }) },
              { label: "Pantalones", href: buildHref(ninos, { tipo: "pantalones" }) },
              { label: "Remeras", href: buildHref(ninos, { tipo: "remeras" }) },
              { label: "Camperas", href: buildHref(ninos, { tipo: "camperas" }) }
            ]
          },
          {
            title: "Temporada",
            links: [
              { label: "Invierno", href: buildHref(ninos, { temporada: "invierno" }) },
              { label: "Termicos", href: buildHref(ninos, { q: "termica" }) },
              { label: "Frizados", href: buildHref(ninos, { q: "frizada" }) },
              { label: "Algodon", href: buildHref(ninos, { q: "algodon" }) }
            ]
          }
        ]
      },
      {
        key: "novedades",
        label: "Novedades",
        page: novedades,
        promo: {
          eyebrow: "Nueva coleccion",
          title: "Lo nuevo de ROMIX",
          cta: "Ver productos",
          href: novedades,
          image: "images/products/campera_oversize_algodon_rustico_azul.png",
          alt: "Nueva coleccion ROMIX"
        },
        columns: [
          {
            title: "Novedades",
            links: [
              { label: "Nuevos ingresos", href: buildHref(novedades, { q: "nuevo" }) },
              { label: "Productos destacados", href: novedades },
              { label: "Ultimas colecciones", href: buildHref(novedades, { q_any: "nuevo,coleccion" }) },
              { label: "Mas vendidos", href: buildHref(novedades, { q: "mas vendido" }) }
            ]
          }
        ]
      }
    ];
  }

  var MENU_CONFIG = buildMenuConfig();

  function getCurrentPage() {
    return (location.pathname.split("/").pop() || "index.html").toLowerCase();
  }

  function getCurrentNavKey(currentPage) {
    var exact = MENU_CONFIG.find(function (item) {
      return item.page.toLowerCase() === currentPage;
    });
    if (exact) return exact.key;
    if (currentPage !== "catalogo.html") return "";

    try {
      var params = new URLSearchParams(window.location.search || "");
      var query = normalizeText(params.get("q") || "");
      if (query.indexOf("oferta") >= 0) return "";
      var rawSection = params.get("section")
        || params.get("seccion")
        || params.get("sections")
        || params.get("secciones")
        || "";
      if (!rawSection || rawSection.indexOf(",") >= 0) return "";
      return normalizeSection(rawSection);
    } catch (_error) {
      return "";
    }
  }

  function buildPanelColumns(columns) {
    return columns.map(function (column) {
      var links = (column.links || []).map(function (link) {
        return '' +
          '<li>' +
            '<a class="mega-panel-link" href="' + escapeHtml(link.href) + '" data-mega-link="true">' + escapeHtml(link.label) + '</a>' +
          '</li>';
      }).join("");

      return '' +
        '<section class="mega-panel-column" aria-label="' + escapeHtml(column.title) + '">' +
          '<p class="mega-panel-title">' + escapeHtml(column.title) + '</p>' +
          '<ul class="mega-panel-list">' + links + '</ul>' +
        '</section>';
    }).join("");
  }

  function buildPanel(item) {
    var columns = buildPanelColumns(item.columns || []);
    var promo = item.promo || {};

    return '' +
      '<div class="mega-panel" id="mega-panel-' + escapeHtml(item.key) + '" role="region" aria-labelledby="mega-trigger-' + escapeHtml(item.key) + '" aria-hidden="true">' +
        '<div class="mega-panel-shell">' +
          '<div class="mega-panel-top">' +
            '<div class="mega-panel-copy">' +
              '<span class="mega-panel-kicker">Explora ' + escapeHtml(item.label) + '</span>' +
              '<a class="mega-panel-viewall" href="' + escapeHtml(item.page) + '" data-mega-link="true">Ver todo</a>' +
            '</div>' +
          '</div>' +
          '<div class="mega-panel-grid">' +
            '<div class="mega-panel-columns">' + columns + '</div>' +
            '<a class="mega-promo" href="' + escapeHtml(promo.href || item.page) + '" data-mega-link="true">' +
              '<img src="' + escapeHtml(promo.image && typeof imageUtils.getThumbPath === "function" ? imageUtils.getThumbPath(promo.image) : (promo.image || "images/logo-romix.png")) + '" alt="' + escapeHtml(promo.alt || item.label) + '" loading="lazy" decoding="async" width="720" height="960" />' +
              '<span class="mega-promo-overlay"></span>' +
              '<span class="mega-promo-copy">' +
                '<span class="mega-promo-eyebrow">' + escapeHtml(promo.eyebrow || "Nueva coleccion") + '</span>' +
                '<strong class="mega-promo-title">' + escapeHtml(promo.title || item.label) + '</strong>' +
                '<span class="mega-promo-cta">' + escapeHtml(promo.cta || "Ver productos") + '</span>' +
              '</span>' +
            '</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function navLinks(activeKey) {
    return MENU_CONFIG.map(function (item) {
      var active = item.key === activeKey;
      return '' +
        '<li class="mega-nav-item' + (active ? ' is-active' : '') + '" data-menu-key="' + escapeHtml(item.key) + '">' +
          '<a class="mega-trigger' + (active ? ' active' : '') + '" id="mega-trigger-' + escapeHtml(item.key) + '" href="' + escapeHtml(item.page) + '" aria-expanded="false" aria-controls="mega-panel-' + escapeHtml(item.key) + '"' + (active ? ' aria-current="page"' : '') + '>' +
            '<span>' + escapeHtml(item.label) + '</span>' +
            '<svg class="mega-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
              '<path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>' +
            '</svg>' +
          '</a>' +
          buildPanel(item) +
        '</li>';
    }).join("");
  }

  function buildHeaderTemplate(activeKey) {
    return '' +
      '<div class="container header-row">' +
        '<div class="header-actions-left" aria-label="Acciones principales">' +
          '<button class="icon-btn mobile-menu-btn" id="toggle-mobile-nav" type="button" aria-label="Abrir menu" aria-controls="header-mobile-nav" aria-expanded="false">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
              '<path d="M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
              '<path d="M4 12H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
              '<path d="M4 17H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
            '</svg>' +
          '</button>' +
          '<button class="icon-btn header-search-mobile" type="button" data-search-toggle="true" aria-label="Abrir buscador" aria-controls="header-search" aria-expanded="false">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
              '<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"></circle>' +
              '<path d="M20 20L17 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
            '</svg>' +
          '</button>' +
        '</div>' +
        '<a class="brand" href="index.html" aria-label="ROMIX inicio">' +
          BRAND_LOGO_PICTURE +
          'ROMIX<span class="brand-dot">.</span>' +
        '</a>' +
        '<nav class="mega-nav" id="header-mobile-nav" aria-label="Principal">' +
          '<div class="mobile-drawer-header">' +
            '<a class="mobile-drawer-brand" href="index.html" aria-label="ROMIX inicio">' +
              BRAND_LOGO_PICTURE +
              '<span>ROMIX</span>' +
            '</a>' +
            '<button class="mobile-drawer-close" id="close-mobile-nav" type="button" aria-label="Cerrar menu">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
                '<path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
                '<path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
              '</svg>' +
            '</button>' +
          '</div>' +
          '<div class="main-nav-wrap">' +
            '<ul class="main-nav">' + navLinks(activeKey) + '</ul>' +
          '</div>' +
        '</nav>' +
        '<div class="header-icons" aria-label="Acciones rapidas">' +
          '<button class="icon-btn header-search-desktop" type="button" data-search-toggle="true" aria-label="Abrir buscador" aria-controls="header-search" aria-expanded="false">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
              '<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"></circle>' +
              '<path d="M20 20L17 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
            '</svg>' +
          '</button>' +
          '<a class="cart-pill" href="cart.html" aria-label="Carrito de compras">' +
            '<span class="cart-pill__icon">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
              '<path d="M3 5h2l2.2 10.2a1.2 1.2 0 0 0 1.2.9h8.8a1.2 1.2 0 0 0 1.2-.95L20 8H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>' +
              '<circle cx="10" cy="19" r="1.4" fill="currentColor"></circle>' +
              '<circle cx="17" cy="19" r="1.4" fill="currentColor"></circle>' +
            '</svg>' +
            '</span>' +
            '<span class="cart-pill__text"><strong>Mi carrito</strong><small>Art&iacute;culos</small></span>' +
            '<span class="icon-badge" id="cart-count">0</span>' +
          '</a>' +
        '</div>' +
      '</div>' +
      '<button class="mobile-nav-scrim" id="mobile-nav-scrim" type="button" aria-label="Cerrar menu" hidden></button>' +
      '<div class="search-panel" id="header-search">' +
        '<div class="container">' +
          '<form id="global-search-form" class="global-search" role="search" aria-label="Buscar productos" action="catalogo.html" method="get">' +
            '<input type="search" name="q" placeholder="Buscar productos..." aria-label="Buscar producto" />' +
            '<button type="submit">Buscar</button>' +
          '</form>' +
        '</div>' +
      '</div>';
  }

  function getCartQty() {
    try {
      var raw = localStorage.getItem("romix_cart");
      if (!raw) raw = localStorage.getItem("cart");
      var parsed = JSON.parse(raw || "[]");
      if (!Array.isArray(parsed)) return 0;
      return parsed.reduce(function (sum, item) {
        var qty = Number((item && (item.quantity || item.qty)) || 1);
        return sum + (Number.isFinite(qty) && qty > 0 ? qty : 0);
      }, 0);
    } catch (_error) {
      return 0;
    }
  }

  function updateCartBadge() {
    var qty = getCartQty();
    var badge = document.getElementById("cart-count");
    if (badge) badge.textContent = String(qty);
  }

  function bindHeaderFavorites() {
    var button = document.querySelector(".header-favorites");
    if (!button) return;
    button.addEventListener("click", function () {
      var active = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", active ? "false" : "true");
    });
  }

  function bindSearchToggle(headerState) {
    var toggles = Array.prototype.slice.call(document.querySelectorAll("[data-search-toggle='true']"));
    var panel = document.getElementById("header-search");
    if (!toggles.length || !panel) return;

    function setOpen(open) {
      panel.classList.toggle("is-open", open);
      toggles.forEach(function (toggle) {
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      if (open) {
        var header = toggles[0].closest("header");
        if (header) header.classList.remove("is-hidden");
      }
      if (open) {
        var input = panel.querySelector('input[name="q"]');
        if (input) input.focus();
      }
    }

    headerState.closeSearch = function () {
      setOpen(false);
    };

    toggles.forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        var willOpen = !panel.classList.contains("is-open");
        if (willOpen && typeof headerState.closeMega === "function") {
          headerState.closeMega();
        }
        if (willOpen && typeof headerState.closeMobileMenu === "function") {
          headerState.closeMobileMenu();
        }
        setOpen(willOpen);
      });
    });

    document.addEventListener("click", function (event) {
      if (!panel.classList.contains("is-open")) return;
      var target = event.target;
      if (panel.contains(target)) return;
      var clickedToggle = toggles.some(function (toggle) {
        return toggle.contains(target);
      });
      if (clickedToggle) return;
      setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && panel.classList.contains("is-open")) {
        setOpen(false);
      }
    });
  }

  function bindMegaMenu(header, headerState) {
    var nav = header.querySelector(".mega-nav");
    if (!nav) return;
    var items = Array.prototype.slice.call(nav.querySelectorAll(".mega-nav-item"));
    if (!items.length) return;

    var mq = window.matchMedia
      ? window.matchMedia("(min-width: 901px)")
      : { matches: true, addEventListener: null, addListener: null };
    var openKey = "";
    var closeTimer = null;
    var CLOSE_DELAY_MS = 180;

    function isDesktop() {
      return mq.matches;
    }

    function cancelScheduledClose() {
      if (!closeTimer) return;
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }

    function scheduleClose() {
      if (!isDesktop()) {
        cancelScheduledClose();
        closeMenu();
        return;
      }
      cancelScheduledClose();
      closeTimer = window.setTimeout(function () {
        closeTimer = null;
        closeMenu();
      }, CLOSE_DELAY_MS);
    }

    function setOpenKey(nextKey) {
      openKey = nextKey || "";
      header.classList.toggle("has-open-menu", !!openKey);

      items.forEach(function (item) {
        var key = item.getAttribute("data-menu-key") || "";
        var open = key === openKey;
        var trigger = item.querySelector(".mega-trigger");
        var panel = item.querySelector(".mega-panel");
        item.classList.toggle("is-open", open);
        if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
        if (panel) panel.setAttribute("aria-hidden", open ? "false" : "true");
      });
    }

    function openMenu(key) {
      if (!key) return;
      cancelScheduledClose();
      if (typeof headerState.closeSearch === "function") headerState.closeSearch();
      setOpenKey(key);
    }

    function closeMenu() {
      cancelScheduledClose();
      setOpenKey("");
    }

    headerState.closeMega = closeMenu;

    items.forEach(function (item) {
      var key = item.getAttribute("data-menu-key") || "";
      var trigger = item.querySelector(".mega-trigger");
      var panel = item.querySelector(".mega-panel");
      if (!trigger) return;

      item.addEventListener("mouseenter", function () {
        if (!isDesktop()) return;
        openMenu(key);
      });

      item.addEventListener("focusin", function () {
        if (!isDesktop()) return;
        openMenu(key);
      });

      item.addEventListener("mouseleave", function () {
        if (!isDesktop()) return;
        scheduleClose();
      });

      if (panel) {
        panel.addEventListener("mouseenter", function () {
          if (!isDesktop()) return;
          cancelScheduledClose();
        });
      }

      trigger.addEventListener("click", function (event) {
        if (!isDesktop()) {
          if (typeof headerState.closeMobileMenu === "function") {
            headerState.closeMobileMenu();
          }
          return;
        }
        if (openKey === key) {
          closeMenu();
          return;
        }
        event.preventDefault();
        openMenu(key);
      });

      trigger.addEventListener("auxclick", function (event) {
        if (event.button !== 1) return;
        if (openKey === key) {
          return;
        }
        event.preventDefault();
      });
    });

    nav.addEventListener("mouseenter", function () {
      if (!isDesktop()) return;
      cancelScheduledClose();
    });

    nav.addEventListener("mouseleave", function () {
      if (!isDesktop()) return;
      scheduleClose();
    });

    header.addEventListener("focusout", function () {
      window.setTimeout(function () {
        if (header.contains(document.activeElement)) return;
        closeMenu();
      }, 0);
    });

    document.addEventListener("click", function (event) {
      var target = event.target;
      if (target && typeof target.closest === "function") {
        if (target.closest("[data-mega-link='true']")) {
          closeMenu();
          return;
        }
      }
      if (header.contains(target)) return;
      closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    function handleViewportChange() {
      closeMenu();
    }

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handleViewportChange);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(handleViewportChange);
    }
  }

  function bindMobileMenu(header, headerState) {
    var toggle = document.getElementById("toggle-mobile-nav");
    var nav = header.querySelector(".mega-nav");
    var scrim = document.getElementById("mobile-nav-scrim");
    var closeButton = document.getElementById("close-mobile-nav");
    if (!toggle || !nav || !scrim) return;

    function isMobile() {
      return window.innerWidth <= 768;
    }

    nav.setAttribute("aria-hidden", isMobile() ? "true" : "false");

    function setOpen(open) {
      var active = !!(open && isMobile());
      document.body.classList.toggle("mobile-nav-open", active);
      header.classList.toggle("mobile-nav-open", active);
      toggle.setAttribute("aria-expanded", active ? "true" : "false");
      scrim.hidden = !active;
      nav.setAttribute("aria-hidden", active ? "false" : "true");
      if (active && closeButton) {
        window.setTimeout(function () {
          closeButton.focus();
        }, 30);
      }
    }

    function closeMenu() {
      if (typeof headerState.closeMega === "function") {
        headerState.closeMega();
      }
      setOpen(false);
    }

    headerState.closeMobileMenu = closeMenu;

    toggle.addEventListener("click", function () {
      var willOpen = !document.body.classList.contains("mobile-nav-open");
      if (willOpen && typeof headerState.closeSearch === "function") headerState.closeSearch();
      if (willOpen && typeof headerState.closeMega === "function") headerState.closeMega();
      setOpen(willOpen);
    });

    scrim.addEventListener("click", closeMenu);
    if (closeButton) closeButton.addEventListener("click", closeMenu);

    nav.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || typeof target.closest !== "function") return;
      var directLink = target.closest("[data-mega-link='true']");
      if (directLink) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", function () {
      if (!isMobile()) closeMenu();
    });
  }

  function bindMobileAutoHide(header) {
    if (!header) return;
    var lastY = window.scrollY || 0;
    var ticking = false;
    var direction = 0;
    var travel = 0;
    var hidden = false;
    var lastToggleAt = 0;
    var MIN_DELTA = 2;
    var TOGGLE_COOLDOWN_MS = 180;

    function update() {
      ticking = false;
      var currentY = Math.max(0, window.scrollY || 0);
      var isMobile = window.innerWidth <= 960;
      var HIDE_AFTER_DOWN = isMobile ? 28 : 54;
      var SHOW_AFTER_UP = isMobile ? 44 : 32;
      var FORCE_VISIBLE_TOP = isMobile ? 24 : 40;
      var MIN_HIDE_Y = isMobile ? 88 : 126;
      var searchPanel = document.getElementById("header-search");
      var searchOpen = !!(searchPanel && searchPanel.classList.contains("is-open"));
      var megaOpen = header.classList.contains("has-open-menu");
      var filtersOpen = document.body && document.body.classList.contains("filters-open");
      var mustStayVisible = searchOpen || megaOpen || filtersOpen || currentY < FORCE_VISIBLE_TOP;

      if (mustStayVisible) {
        hidden = false;
        direction = 0;
        travel = 0;
        header.classList.remove("is-hidden");
        lastY = currentY;
        return;
      }

      var delta = currentY - lastY;
      if (Math.abs(delta) < MIN_DELTA) {
        lastY = currentY;
        return;
      }

      var nextDirection = delta > 0 ? 1 : -1;
      if (nextDirection !== direction) {
        direction = nextDirection;
        travel = 0;
      }
      travel += Math.abs(delta);

      var now = performance.now ? performance.now() : Date.now();
      var coolingDown = (now - lastToggleAt) < TOGGLE_COOLDOWN_MS;

      if (!coolingDown && !hidden && direction > 0 && currentY > MIN_HIDE_Y && travel >= HIDE_AFTER_DOWN) {
        hidden = true;
        travel = 0;
        lastToggleAt = now;
        header.classList.add("is-hidden");
      } else if (!coolingDown && hidden && (currentY < FORCE_VISIBLE_TOP || (direction < 0 && travel >= SHOW_AFTER_UP))) {
        hidden = false;
        travel = 0;
        lastToggleAt = now;
        header.classList.remove("is-hidden");
      }

      lastY = currentY;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  function dispatchHeaderReady(detail) {
    document.dispatchEvent(new CustomEvent("romix:header-ready", { detail: detail || {} }));
  }

  function ensureSearchScript() {
    if (window.romixSearch) return Promise.resolve(false);

    var existing = document.querySelector('script[src$="assets/js/search.js"], script[src*="/assets/js/search.js"]');
    if (existing) {
      if (window.romixSearch || existing.dataset.loaded === "1") return Promise.resolve(false);
      return new Promise(function (resolve) {
        existing.addEventListener("load", function () {
          existing.dataset.loaded = "1";
          resolve(false);
        }, { once: true });
        existing.addEventListener("error", function () {
          resolve(false);
        }, { once: true });
      });
    }

    return new Promise(function (resolve) {
      var script = document.createElement("script");
      script.src = "assets/js/search.js";
      script.async = false;
      script.dataset.romixSearch = "1";
      script.addEventListener("load", function () {
        script.dataset.loaded = "1";
        resolve(true);
      }, { once: true });
      script.addEventListener("error", function () {
        resolve(false);
      }, { once: true });
      document.head.appendChild(script);
    });
  }

  function init() {
    var current = getCurrentPage();
    var activeKey = getCurrentNavKey(current);
    var oldHeader = document.querySelector("header.site-header, header.romix-shared-header, header");
    var headerState = {
      closeSearch: function () {},
      closeMega: function () {}
    };

    var newHeader = document.createElement("header");
    newHeader.className = "site-header romix-shared-header";
    newHeader.innerHTML = buildHeaderTemplate(activeKey);

    if (oldHeader && oldHeader.parentNode) {
      oldHeader.replaceWith(newHeader);
    } else if (document.body) {
      document.body.insertAdjacentElement("afterbegin", newHeader);
    }

    bindSearchToggle(headerState);
    bindMegaMenu(newHeader, headerState);
    bindMobileMenu(newHeader, headerState);
    bindMobileAutoHide(newHeader);
    bindHeaderFavorites();
    updateCartBadge();
    window.addEventListener("storage", updateCartBadge);
    ensureSearchScript().then(function (autoloaded) {
      dispatchHeaderReady({ rebuilt: true, page: current, activeKey: activeKey, searchAutoloaded: !!autoloaded });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
