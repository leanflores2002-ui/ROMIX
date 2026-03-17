(function () {
  function getCurrentPage() {
    var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    return file;
  }

  function navLinks(current) {
    var pages = [
      { href: 'mujer.html', label: 'Mujer' },
      { href: 'hombre.html', label: 'Hombre' },
      { href: 'ninos.html', label: 'Niños' },
      { href: 'novedades.html', label: 'Novedades' }
    ];
    return pages.map(function (item) {
      var active = item.href.toLowerCase() === current;
      return '<li><a href="' + item.href + '"' + (active ? ' class="active" aria-current="page"' : '') + '>' + item.label + '</a></li>';
    }).join('');
  }

  function buildHeaderTemplate(current) {
    return '' +
      '<div class="container header-row">' +
        '<a class="brand" href="index.html" aria-label="ROMIX inicio">' +
          '<img src="images/logo-romix.png" alt="Logo ROMIX" />' +
          'ROMIX<span class="brand-dot">.</span>' +
        '</a>' +
        '<nav aria-label="Principal">' +
          '<ul class="main-nav">' + navLinks(current) + '</ul>' +
        '</nav>' +
        '<div class="header-icons" aria-label="Acciones rápidas">' +
          '<button class="icon-btn" id="toggleSearch" type="button" aria-label="Abrir buscador" aria-controls="header-search" aria-expanded="false">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
              '<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"></circle>' +
              '<path d="M20 20L17 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
            '</svg>' +
          '</button>' +
          '<a class="icon-btn" href="cart.html" aria-label="Carrito de compras">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
              '<path d="M3 5h2l2.2 10.2a1.2 1.2 0 0 0 1.2.9h8.8a1.2 1.2 0 0 0 1.2-.95L20 8H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>' +
              '<circle cx="10" cy="19" r="1.4" fill="currentColor"></circle>' +
              '<circle cx="17" cy="19" r="1.4" fill="currentColor"></circle>' +
            '</svg>' +
            '<span class="icon-badge" id="cart-count">0</span>' +
          '</a>' +
        '</div>' +
      '</div>' +
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
      var raw = localStorage.getItem('romix_cart');
      if (!raw) raw = localStorage.getItem('cart');
      var parsed = JSON.parse(raw || '[]');
      if (!Array.isArray(parsed)) return 0;
      return parsed.reduce(function (sum, item) {
        var qty = Number((item && (item.quantity || item.qty)) || 1);
        return sum + (Number.isFinite(qty) && qty > 0 ? qty : 0);
      }, 0);
    } catch (_) {
      return 0;
    }
  }

  function updateCartBadge() {
    var qty = getCartQty();
    var badge = document.getElementById('cart-count');
    if (badge) badge.textContent = String(qty);
  }

  function bindSearchToggle() {
    var toggle = document.getElementById('toggleSearch');
    var panel = document.getElementById('header-search');
    if (!toggle || !panel) return;

    function setOpen(open) {
      panel.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        var header = toggle.closest('header');
        if (header) header.classList.remove('is-hidden');
      }
      if (open) {
        var input = panel.querySelector('input[name="q"]');
        if (input) input.focus();
      }
    }

    toggle.addEventListener('click', function () {
      var willOpen = !panel.classList.contains('is-open');
      setOpen(willOpen);
    });

    document.addEventListener('click', function (event) {
      if (!panel.classList.contains('is-open')) return;
      var target = event.target;
      if (panel.contains(target) || toggle.contains(target)) return;
      setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && panel.classList.contains('is-open')) {
        setOpen(false);
      }
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
      var searchPanel = document.getElementById('header-search');
      var searchOpen = !!(searchPanel && searchPanel.classList.contains('is-open'));
      var filtersOpen = document.body && document.body.classList.contains('filters-open');
      var mustStayVisible = searchOpen || filtersOpen || currentY < FORCE_VISIBLE_TOP;

      if (mustStayVisible) {
        hidden = false;
        direction = 0;
        travel = 0;
        header.classList.remove('is-hidden');
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
        header.classList.add('is-hidden');
      } else if (!coolingDown && hidden && (currentY < FORCE_VISIBLE_TOP || (direction < 0 && travel >= SHOW_AFTER_UP))) {
        hidden = false;
        travel = 0;
        lastToggleAt = now;
        header.classList.remove('is-hidden');
      }

      lastY = currentY;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function dispatchHeaderReady(detail) {
    document.dispatchEvent(new CustomEvent('romix:header-ready', { detail: detail || {} }));
  }

  function ensureSearchScript() {
    if (window.romixSearch) return Promise.resolve(false);

    var existing = document.querySelector('script[src$="assets/js/search.js"], script[src*="/assets/js/search.js"]');
    if (existing) {
      if (window.romixSearch || existing.dataset.loaded === '1') return Promise.resolve(false);
      return new Promise(function (resolve) {
        existing.addEventListener('load', function () {
          existing.dataset.loaded = '1';
          resolve(false);
        }, { once: true });
        existing.addEventListener('error', function () { resolve(false); }, { once: true });
      });
    }

    return new Promise(function (resolve) {
      var script = document.createElement('script');
      script.src = 'assets/js/search.js';
      script.async = false;
      script.dataset.romixSearch = '1';
      script.addEventListener('load', function () {
        script.dataset.loaded = '1';
        resolve(true);
      }, { once: true });
      script.addEventListener('error', function () { resolve(false); }, { once: true });
      document.head.appendChild(script);
    });
  }

  function init() {
    var current = getCurrentPage();
    var oldHeader = document.querySelector('header.site-header, header.romix-shared-header, header');

    var newHeader = document.createElement('header');
    newHeader.className = 'site-header romix-shared-header';
    newHeader.innerHTML = buildHeaderTemplate(current);

    if (oldHeader && oldHeader.parentNode) {
      oldHeader.replaceWith(newHeader);
    } else if (document.body) {
      document.body.insertAdjacentElement('afterbegin', newHeader);
    }

    bindSearchToggle();
    bindMobileAutoHide(newHeader);
    updateCartBadge();
    window.addEventListener('storage', updateCartBadge);
    ensureSearchScript().then(function (autoloaded) {
      dispatchHeaderReady({ rebuilt: true, page: current, searchAutoloaded: !!autoloaded });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
