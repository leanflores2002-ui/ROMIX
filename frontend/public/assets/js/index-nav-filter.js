// Convierte los links de navegación (Mujer/Hombre/Niños)
// en filtros dentro de la misma página (SPA-like).
(function(){
  function byId(id){ return document.getElementById(id); }
  function cap(sec){ if(sec==='mujer') return 'Mujer'; if(sec==='hombre') return 'Hombre'; return 'Niños'; }
  function updateTitleAndCount(sec){
    try {
      var t = byId('collection-title'); if (t) t.textContent = 'Colección ' + cap(sec);
      var grid = byId(sec+'-grid');
      var total = grid ? grid.children.length : 0;
      var shown = grid ? Array.from(grid.children).filter(function(el){ return el.style.display !== 'none'; }).length : 0;
      var info = byId('count-info'); if (info) info.textContent = 'Mostrando ' + shown + ' de ' + total + ' productos';
    } catch {}
  }
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
    setTimeout(function(){ updateTitleAndCount(sec); }, 30);
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
          setTimeout(function(){ updateTitleAndCount(sec); }, 30);
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
    if (!hash || ['mujer','hombre','ninos'].indexOf(hash)===-1) { hash = 'mujer'; }
    var sectionSel = document.getElementById('filter-section');
    if (sectionSel && typeof window.applyGlobalFilters === 'function') {
      sectionSel.value = hash; window.applyGlobalFilters();
      var target = byId(hash) || document.querySelector('.products-grid');
      if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
      setTimeout(function(){ updateTitleAndCount(hash); }, 30);
      return;
    }
    showSectionOnly(hash);
  }

  document.addEventListener('DOMContentLoaded', function(){
    try { wireLinks(); applyInitialFromHash(); } catch (e) { console.warn('[romix] nav-filter init failed', e); }
  });
})();
