// Convierte los links de navegación (Mujer/Hombre/Niños)
// en filtros dentro de la misma página (SPA-like).
(function(){
  function byId(id){ return document.getElementById(id); }
  function showSectionOnly(sec){
    var sections = ['mujer','hombre','ninos'];
    sections.forEach(function(s){
      var el = byId(s);
      if (el) el.classList.toggle('hidden', s !== sec);
    });
    // Marcar activo en navegación si hay elementos con data-section
    document.querySelectorAll('[data-section]').forEach(function(a){
      var active = a.dataset.section === sec;
      if (active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
      a.classList.toggle('active', active);
    });
    // Actualizar hash y enfocar la sección
    try {
      history.replaceState({}, '', '#' + sec);
    } catch {}
    var target = byId(sec);
    if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function showAll(){
    ['mujer','hombre','ninos'].forEach(function(s){ var el = byId(s); if (el) el.classList.remove('hidden'); });
    document.querySelectorAll('[data-section]').forEach(function(a){ a.classList.remove('active'); a.removeAttribute('aria-current'); });
    try { history.replaceState({}, '', location.pathname + location.search); } catch {}
  }

  function wireLinks(){
    // Interceptar links existentes que apuntan a *.html
    var selector = 'a[href$="mujer.html"], a[href$="hombre.html"], a[href$="ninos.html"]';
    var anchors = Array.prototype.slice.call(document.querySelectorAll(selector));
    anchors.forEach(function(a){
      var href = String(a.getAttribute('href')||'');
      var sec = href.indexOf('mujer')>-1 ? 'mujer' : (href.indexOf('hombre')>-1 ? 'hombre' : 'ninos');
      a.dataset.section = sec;
      a.addEventListener('click', function(e){
        // Si el filtro global existe, úsalo para ocultar el resto de forma consistente
        var sectionSel = document.getElementById('filter-section');
        if (sectionSel && typeof window.applyGlobalFilters === 'function') {
          e.preventDefault();
          sectionSel.value = sec;
          window.applyGlobalFilters();
          // Desplazar a la primera grilla disponible
          var target = byId(sec) || document.querySelector('.products-grid');
          if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
          try { history.replaceState({}, '', '#' + sec); } catch {}
          return;
        }
        // Fallback: ocultar secciones manualmente en esta misma página
        e.preventDefault();
        showSectionOnly(sec);
      });
    });

    // Botón "Mostrar todo" inyectado al lado de cada título de sección
    document.querySelectorAll('.section-title').forEach(function(title){
      if (title.querySelector('.show-all')) return;
      var btn = document.createElement('button');
      btn.className = 'show-all';
      btn.textContent = 'Mostrar todo';
      btn.style.cssText = 'margin-left:10px;border:1px solid #e9ecef;background:#fff;padding:6px 10px;border-radius:8px;cursor:pointer;font-weight:600;';
      btn.addEventListener('click', function(e){ e.preventDefault(); showAll(); });
      title.appendChild(btn);
    });
  }

  function applyInitialFromHash(){
    var hash = (location.hash||'').replace('#','');
    if (!hash) return;
    if (['mujer','hombre','ninos'].indexOf(hash)===-1) return;
    var sectionSel = document.getElementById('filter-section');
    if (sectionSel && typeof window.applyGlobalFilters === 'function') {
      sectionSel.value = hash; window.applyGlobalFilters();
      var target = byId(hash) || document.querySelector('.products-grid');
      if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
      return;
    }
    showSectionOnly(hash);
  }

  document.addEventListener('DOMContentLoaded', function(){
    try { wireLinks(); applyInitialFromHash(); } catch (e) { console.warn('[romix] nav-filter init failed', e); }
  });
})();

