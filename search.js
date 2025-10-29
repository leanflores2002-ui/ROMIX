// Simple shared search for ROMIX
(function(){
  let PRODUCTS = null;
  let SUGGEST_BOX = null;
  let SUGGEST_INDEX = -1;

  function qs(name) {
    const p = new URLSearchParams(location.search);
    return (p.get(name) || '').trim();
  }
  function norm(s){
    if (!s) return '';
    try { return s.normalize('NFD').replace(/\p{Diacritic}+/gu,'').toLowerCase(); } catch { return String(s).toLowerCase(); }
  }
  function slugify(s){
    return norm(String(s||''))
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'');
  }
  function ensureProducts(){
    if (PRODUCTS) return Promise.resolve(PRODUCTS);
    return fetch('products.json').then(r=>r.json()).then(d=>{ PRODUCTS=d||[]; return PRODUCTS; }).catch(()=>[]);
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
  function renderSuggestions(root, items){
    if (!SUGGEST_BOX) return;
    if (!items || !items.length) { SUGGEST_BOX.innerHTML=''; SUGGEST_BOX.style.display='none'; SUGGEST_INDEX=-1; return; }
    const q = (root.querySelector('input[name="q"]').value || '').trim();
    const qn = norm(q);
    const hi = (text)=>{
      const t = String(text||'');
      if (!qn) return t;
      const i = norm(t).indexOf(qn);
      if (i<0) return t;
      return t.substring(0,i) + '<strong>' + t.substring(i, i+q.length) + '</strong>' + t.substring(i+q.length);
    };
    SUGGEST_INDEX = -1;
    SUGGEST_BOX.innerHTML = items.map((it,i)=>{
      return `<div class="search-suggestion" data-slug="${it.slug}"><i class="fas fa-search"></i><div><div class="t">${hi(it.name)}</div><small>${it.type||''}</small></div></div>`;
    }).join('');
    SUGGEST_BOX.style.display='block';
    SUGGEST_BOX.querySelectorAll('.search-suggestion').forEach((el)=>{
      el.addEventListener('mousedown', (e)=>{ // mousedown para que no pierda foco antes del click
        e.preventDefault();
        const slug = el.dataset.slug;
        location.href = 'product.html?slug=' + encodeURIComponent(slug);
      });
    });
  }
  function buildCandidates(q){
    const qn = norm(q);
    const list = (PRODUCTS||[]).map(p=>({ name: p.name||'', type: p.type||'', slug: slugify(p.name||'') }));
    const scored = list.map(it=>{
      const name = norm(it.name);
      const type = norm(it.type);
      let score = -1;
      if (!qn) score = -1;
      else if (name.startsWith(qn)) score = 100 - name.length;
      else if (name.includes(qn)) score = 80 - name.indexOf(qn);
      else if (type.includes(qn)) score = 60 - type.indexOf(qn);
      return { it, score };
    }).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score).slice(0,8).map(x=>x.it);
    return scored;
  }
  function wireForm(){
    const form = document.getElementById('global-search-form');
    if (!form) return;
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const input = form.querySelector('input[name="q"]');
      const q = (input && input.value || '').trim();
      if (!q) return;
      // Si hay una sugerencia seleccionada, ir a su detalle
      const active = SUGGEST_INDEX>=0 ? SUGGEST_BOX.querySelectorAll('.search-suggestion')[SUGGEST_INDEX] : null;
      if (active) {
        const slug = active.dataset.slug; location.href = 'product.html?slug=' + encodeURIComponent(slug); return;
      }
      // Sino, ir a index con q
      const base = location.pathname.endsWith('index.html') ? 'index.html' : 'index.html';
      location.href = base + '?q=' + encodeURIComponent(q);
    });
    // Autocomplete UI
    const input = form.querySelector('input[name="q"]');
    form.classList.add('has-suggest');
    SUGGEST_BOX = document.createElement('div');
    SUGGEST_BOX.className = 'search-suggestions';
    SUGGEST_BOX.style.display='none';
    form.appendChild(SUGGEST_BOX);

    let debounce;
    input.addEventListener('input', ()=>{
      clearTimeout(debounce);
      const q = input.value.trim();
      if (q.length < 2) { renderSuggestions(form, []); return; }
      debounce = setTimeout(()=>{
        ensureProducts().then(()=>{
          renderSuggestions(form, buildCandidates(q));
        });
      }, 120);
    });
    input.addEventListener('keydown', (e)=>{
      const items = SUGGEST_BOX && SUGGEST_BOX.querySelectorAll('.search-suggestion');
      if (!items || !items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); SUGGEST_INDEX = (SUGGEST_INDEX+1) % items.length; items.forEach((el,i)=>el.classList.toggle('active', i===SUGGEST_INDEX)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); SUGGEST_INDEX = (SUGGEST_INDEX-1+items.length) % items.length; items.forEach((el,i)=>el.classList.toggle('active', i===SUGGEST_INDEX)); }
      if (e.key === 'Escape') { renderSuggestions(form, []); }
      if (e.key === 'Enter' && SUGGEST_INDEX>=0) { e.preventDefault(); const el = items[SUGGEST_INDEX]; el && el.dispatchEvent(new Event('mousedown', {bubbles:true})); }
    });
    document.addEventListener('click', (e)=>{ if (!form.contains(e.target)) renderSuggestions(form, []); });
  }
  document.addEventListener('DOMContentLoaded', ()=>{ wireForm(); runIfNeeded(); });
  // Expose minimal API for debugging
  window.romixSearch = { run: runIfNeeded, focus: findAndFocus, slug: slugify };
})();
