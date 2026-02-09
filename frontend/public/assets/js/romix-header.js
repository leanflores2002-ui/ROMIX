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
