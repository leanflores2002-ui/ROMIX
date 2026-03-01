document.addEventListener('DOMContentLoaded', function () {
  var header = document.querySelector('header');
  if (!header) return;

  var nav = header.querySelector('.nav-secondary');
  if (nav && !nav.id) {
    nav.id = 'romix-main-nav';
  }

  var icons = header.querySelector('.topbar-icons');
  if (icons && nav) {
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'icon-btn menu-toggle';
    toggle.setAttribute('aria-controls', nav.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
    toggle.innerHTML = '<span class="sr-only">Abrir menú</span><i class="fas fa-bars" aria-hidden="true"></i>';
    icons.prepend(toggle);

    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      var icon = toggle.querySelector('i');
      if (icon) {
        icon.className = open ? 'fas fa-times' : 'fas fa-bars';
      }
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.matchMedia('(max-width: 860px)').matches) {
          header.classList.remove('nav-open');
          toggle.setAttribute('aria-expanded', 'false');
          var icon = toggle.querySelector('i');
          if (icon) icon.className = 'fas fa-bars';
        }
      });
    });
  }

  if (nav) {
    var current = location.pathname.split('/').pop() || 'index.html';
    nav.querySelectorAll('a').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      if (href === current) {
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  function initMegaMenu() {
    if (!nav || !header) return;

    var media = window.matchMedia('(min-width: 981px)');
    var megaWrap = document.createElement('div');
    megaWrap.className = 'romix-mega';
    megaWrap.innerHTML = '' +
      '<div class="romix-mega-panel" role="dialog" aria-hidden="true">' +
        '<div class="romix-mega-head">' +
          '<div>' +
            '<div class="romix-mega-sub">Tipos</div>' +
            '<div class="romix-mega-title">Vista previa</div>' +
          '</div>' +
          '<a class="romix-mega-all" href="#">Ver todo</a>' +
        '</div>' +
        '<div class="romix-mega-grid"></div>' +
      '</div>';
    header.appendChild(megaWrap);

    var panel = megaWrap.querySelector('.romix-mega-panel');
    var grid = megaWrap.querySelector('.romix-mega-grid');
    var title = megaWrap.querySelector('.romix-mega-title');
    var viewAll = megaWrap.querySelector('.romix-mega-all');

    var activeLink = null;
    var hideTimer = null;
    var dataPromise = null;
    var dataCache = null;

    function slugify(text) {
      var raw = String(text || '').trim().toLowerCase();
      try {
        return raw.normalize('NFD').replace(/\p{Diacritic}+/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      } catch {
        return raw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      }
    }

    function sectionKeyForLink(link) {
      if (!link) return null;
      var explicit = link.getAttribute('data-section');
      if (explicit) return explicit;
      var href = (link.getAttribute('href') || '').toLowerCase();
      if (href.indexOf('mujer') >= 0) return 'mujer';
      if (href.indexOf('hombre') >= 0) return 'hombre';
      if (href.indexOf('ninos') >= 0 || href.indexOf('niños') >= 0) return 'ninos';
      if (href.indexOf('novedades') >= 0) return 'novedades';
      var text = slugify(link.textContent || '');
      if (text.indexOf('mujer') >= 0) return 'mujer';
      if (text.indexOf('hombre') >= 0) return 'hombre';
      if (text.indexOf('ninos') >= 0 || text.indexOf('ni-os') >= 0) return 'ninos';
      if (text.indexOf('novedades') >= 0) return 'novedades';
      return null;
    }

    function pickImage(product) {
      if (!product) return '';
      if (product.image) return product.image;
      if (product.images && typeof product.images === 'object') {
        var keys = Object.keys(product.images);
        if (keys.length) return product.images[keys[0]];
      }
      return '';
    }

    function titleCase(text) {
      var clean = String(text || '').trim();
      if (!clean) return '';
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }

    function normalizeList(list) {
      if (typeof window.sanitizeList === 'function') return window.sanitizeList(list);
      return Array.isArray(list) ? list : [];
    }

    function normalizeSeasonValue(value) {
      return String(value || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '');
    }

    function loadProducts() {
      if (dataCache) return Promise.resolve(dataCache);
      if (dataPromise) return dataPromise;
      if (window.romixProductsStore && typeof window.romixProductsStore.load === 'function') {
        dataPromise = window.romixProductsStore.load({ useApi: false })
          .then(function (list) { dataCache = normalizeList(list); return dataCache; })
          .catch(function () { dataCache = []; return dataCache; });
        return dataPromise;
      }
      dataPromise = fetch('assets/data/products.json')
        .then(function (res) { return res.ok ? res.json() : []; })
        .then(function (list) { dataCache = normalizeList(list); return dataCache; })
        .catch(function () { dataCache = []; return dataCache; });
      return dataPromise;
    }

    function buildSectionMap(list) {
      var map = {};
      list.forEach(function (p) {
        if (!p || !p.section || !p.type) return;
        var seasonKey = normalizeSeasonValue(p.season);
        if (seasonKey === 'verano') return;
        var section = String(p.section).toLowerCase();
        var type = String(p.type).trim();
        if (!type) return;
        if (!map[section]) map[section] = { types: new Map() };
        if (!map[section].types.has(type)) {
          map[section].types.set(type, {
            type: type,
            image: pickImage(p)
          });
        }
      });
      return map;
    }

    function collectAllTypes(map) {
      var all = new Map();
      Object.keys(map || {}).forEach(function (key) {
        var entry = map[key];
        if (!entry || !entry.types) return;
        entry.types.forEach(function (value, typeKey) {
          if (!all.has(typeKey)) all.set(typeKey, value);
        });
      });
      return Array.from(all.values());
    }

    function renderSection(sectionKey, sectionLabel, href) {
      if (!media.matches) return;
      loadProducts().then(function (list) {
        var map = buildSectionMap(list);
        var items = [];
        if (sectionKey === 'novedades') {
          items = collectAllTypes(map);
        } else {
          var entry = map[sectionKey];
          if (entry && entry.types) items = Array.from(entry.types.values());
        }
        if (!items.length) {
          hidePanel();
          return;
        }
        items = items.sort(function (a, b) {
          return a.type.localeCompare(b.type);
        });
        var MAX_TYPES = 14;
        items = items.slice(0, MAX_TYPES);
        grid.innerHTML = '';
        var frag = document.createDocumentFragment();
        items.forEach(function (item) {
          var link = document.createElement('a');
          link.className = 'romix-mega-item';
          link.href = href || '#';
          link.setAttribute('data-type', item.type);
          var thumb = document.createElement('span');
          thumb.className = 'romix-mega-thumb';
          var img = document.createElement('img');
          img.loading = 'lazy';
          img.alt = item.type;
          img.src = item.image || 'images/placeholder.jpg';
          img.onerror = function () { this.onerror = null; this.src = 'images/placeholder.jpg'; };
          thumb.appendChild(img);
          var label = document.createElement('span');
          label.className = 'romix-mega-label';
          label.textContent = titleCase(item.type);
          link.appendChild(thumb);
          link.appendChild(label);
          frag.appendChild(link);
        });
        grid.appendChild(frag);
        title.textContent = sectionLabel || 'Vista previa';
        viewAll.href = href || '#';
        panel.setAttribute('aria-hidden', 'false');
        header.classList.add('mega-open');
      });
    }

    function hidePanel() {
      header.classList.remove('mega-open');
      panel.setAttribute('aria-hidden', 'true');
      activeLink = null;
    }

    function scheduleHide() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hidePanel, 120);
    }

    function cancelHide() {
      clearTimeout(hideTimer);
    }

    nav.querySelectorAll('a').forEach(function (link) {
      var sectionKey = sectionKeyForLink(link);
      if (!sectionKey) return;
      link.setAttribute('data-section', sectionKey);

      link.addEventListener('mouseenter', function () {
        if (!media.matches) return;
        cancelHide();
        activeLink = link;
        var label = link.textContent || '';
        renderSection(sectionKey, label, link.href);
      });

      link.addEventListener('focus', function () {
        if (!media.matches) return;
        cancelHide();
        activeLink = link;
        var label = link.textContent || '';
        renderSection(sectionKey, label, link.href);
      });

      link.addEventListener('mouseleave', function () {
        if (!media.matches) return;
        scheduleHide();
      });
    });

    megaWrap.addEventListener('mouseenter', function () {
      if (!media.matches) return;
      cancelHide();
    });

    megaWrap.addEventListener('mouseleave', function () {
      if (!media.matches) return;
      scheduleHide();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') hidePanel();
    });

    window.addEventListener('resize', function () {
      if (!media.matches) hidePanel();
    });
  }

  initMegaMenu();

  var lastY = window.scrollY;
  window.addEventListener('scroll', function () {
    var currentY = window.scrollY;
    var goingDown = currentY > lastY;
    if (currentY > 80 && goingDown) {
      header.classList.add('header-hidden');
    } else {
      header.classList.remove('header-hidden');
    }
    lastY = currentY;
  }, { passive: true });
});
