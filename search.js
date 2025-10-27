// Simple shared search for ROMIX
(function(){
  function qs(name) {
    const p = new URLSearchParams(location.search);
    return (p.get(name) || '').trim();
  }
  function norm(s){
    if (!s) return '';
    try { return s.normalize('NFD').replace(/\p{Diacritic}+/gu,'').toLowerCase(); } catch { return String(s).toLowerCase(); }
  }
  function findAndFocus(query){
    const q = norm(query);
    const cards = document.querySelectorAll('.product-card');
    let first; let matchName='';
    cards.forEach(c=>{
      if (first) return;
      let nameText = '';
      try {
        const data = JSON.parse(c.dataset.product || '{}');
        nameText = data && data.name ? data.name : '';
      } catch {}
      if (!nameText) {
        const el = c.querySelector('.product-title');
        nameText = el ? el.textContent : '';
      }
      if (norm(nameText).includes(q)) { first = c; matchName = nameText; }
    });
    if (first) {
      first.scrollIntoView({behavior:'smooth', block:'center'});
      first.classList.add('search-highlight');
      setTimeout(()=> first && first.classList.remove('search-highlight'), 2000);
      return true;
    }
    return false;
  }
  function runIfNeeded(){
    const q = qs('q');
    if (!q) return;
    // Try up to 20 times waiting for products to render
    let tries = 0; const max = 20;
    const timer = setInterval(()=>{
      tries++;
      if (findAndFocus(q) || tries>=max) clearInterval(timer);
    }, 200);
  }
  function wireForm(){
    const form = document.getElementById('global-search-form');
    if (!form) return;
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const input = form.querySelector('input[name="q"]');
      const q = (input && input.value || '').trim();
      if (!q) return;
      // Always land on index with q param
      const base = location.pathname.endsWith('index.html') ? 'index.html' : 'index.html';
      location.href = base + '?q=' + encodeURIComponent(q);
    });
  }
  document.addEventListener('DOMContentLoaded', ()=>{ wireForm(); runIfNeeded(); });
  // Expose minimal API for debugging
  window.romixSearch = { run: runIfNeeded, focus: findAndFocus };
})();

