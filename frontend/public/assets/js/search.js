// Simple shared search for ROMIX
// Centralized search logic for all ROMIX pages
(function(){
  let PRODUCTS = null;
  let SUGGEST_BOX = null;
  let SUGGEST_INDEX = -1;

  const globalFixUtf8 = typeof window.fixUtf8 === 'function' ? window.fixUtf8 : (s => s);
  const hideProduct = typeof window.romixShouldHideProduct === 'function'
    ? window.romixShouldHideProduct
    : (p => false);
  function sanitizeProducts(list){
    const seen = new Set();
    const out = [];
    (Array.isArray(list) ? list : []).forEach(p=>{
      if (!p || !p.name) return;
      const copy = Object.assign({}, p);
      ['name','type','section','badge','description'].forEach(k=>{ if (copy[k]) copy[k] = globalFixUtf8(String(copy[k])); });
      if (Array.isArray(copy.colors)) copy.colors = copy.colors.map(c=> Object.assign({}, c, { name: globalFixUtf8(c && c.name) }));
      if (hideProduct(copy)) return;
      const key = String(copy.id || copy.name).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(copy);
    });
    return out;
  }

  function qs(name) {
    const p = new URLSearchParams(location.search);
    return (p.get(name) || '').trim();
  }
  function norm(s){
    if (!s) return '';
    try { return s.normalize('NFD').replace(/\p{Diacritic}+/gu,'').toLowerCase(); } catch { return String(s).toLowerCase(); }
  }
  function compact(s){
    return norm(s).replace(/[^a-z0-9]+/g,'');
  }
  function tokenize(s){
    return norm(s).split(/[^a-z0-9]+/).filter(Boolean);
  }
  function editDistanceAtMost(a, b, max){
    if (a === b) return true;
    if (!a || !b) return false;
    const al = a.length;
    const bl = b.length;
    if (Math.abs(al - bl) > max) return false;
    const prev = new Array(bl + 1);
    const curr = new Array(bl + 1);
    for (let j = 0; j <= bl; j++) prev[j] = j;
    for (let i = 1; i <= al; i++){
      curr[0] = i;
      let rowMin = curr[0];
      const ai = a.charCodeAt(i - 1);
      for (let j = 1; j <= bl; j++){
        const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(
          prev[j] + 1,
          curr[j - 1] + 1,
          prev[j - 1] + cost
        );
        if (curr[j] < rowMin) rowMin = curr[j];
      }
      if (rowMin > max) return false;
      for (let j = 0; j <= bl; j++) prev[j] = curr[j];
    }
    return prev[bl] <= max;
  }
  function tokenMatchScore(tokens, combined, words){
    if (!tokens.length) return -1;
    let matched = 0;
    for (let i = 0; i < tokens.length; i++){
      const t = tokens[i];
      if (!t) continue;
      if (combined.includes(t)) { matched++; continue; }
      if (words.some(w => w.startsWith(t))) { matched++; continue; }
      if (t.length >= 3) {
        const max = t.length <= 5 ? 1 : 2;
        if (words.some(w => editDistanceAtMost(t, w, max))) { matched++; continue; }
      }
    }
    if (!matched) return -1;
    if (matched < tokens.length) return 40 + matched * 3;
    return 70 + matched * 3;
  }
  function defaultSlugify(s){
    return norm(String(s||''))
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'');
  }
  function slugify(s){
    const shared = typeof window.romixSlugify === 'function' ? window.romixSlugify : window.slugify;
    if (typeof shared === 'function') return shared(s);
    return defaultSlugify(s);
  }
  function buildDetailUrl(product, slugOverride, nameOverride){
    const slugValue = slugOverride || slugify(product && product.name ? product.name : '');
    const nameValue = nameOverride || globalFixUtf8(product && product.name ? product.name : '');
    const pid = typeof window.productId === 'function' ? window.productId(product) : slugValue;
    return 'product.html?id=' + encodeURIComponent(pid) +
      '&slug=' + encodeURIComponent(slugValue) +
      '&name=' + encodeURIComponent(nameValue);
  }
  function ensureProducts(){
    if (PRODUCTS) return Promise.resolve(PRODUCTS);
    if (Array.isArray(window.PRELOADED_PRODUCTS) && window.PRELOADED_PRODUCTS.length) {
      PRODUCTS = sanitizeProducts(window.PRELOADED_PRODUCTS);
      return Promise.resolve(PRODUCTS);
    }
    if (window.romixProductsStore && typeof window.romixProductsStore.load === 'function') {
      return window.romixProductsStore
        .load({ preloaded: window.PRELOADED_PRODUCTS })
        .then(d => { PRODUCTS = sanitizeProducts(d || []); return PRODUCTS; })
        .catch(() => []);
    }
    const tryApi = () => fetch('/api/products').then(r=>r.ok?r.json():Promise.reject());
    const tryFile = () => fetch(new URL('assets/data/products.json', location.href)).then(r=>r.json());
    return tryApi().catch(tryFile).then(d=>{ PRODUCTS=sanitizeProducts(d||[]); return PRODUCTS; }).catch(()=>[]);
  }

  // --- Core search ----
  function scoreProduct(p, qn){
    const name = norm(p.name||'');
    const type = norm(p.type||'');
    const desc = norm(p.description||'');
    if (!qn) return -1;
    if (name.startsWith(qn)) return 120 - name.length;
    if (name.includes(qn)) return 100 - name.indexOf(qn);
    if (type.includes(qn)) return 80 - type.indexOf(qn);
    if (desc.includes(qn)) return 60 - desc.indexOf(qn);
    const compactQ = compact(qn);
    if (compactQ && compact(name).includes(compactQ)) return 75;
    const combined = [name, type, desc].filter(Boolean).join(' ');
    const words = tokenize(combined);
    const tokens = tokenize(qn);
    const tokenScore = tokenMatchScore(tokens, combined, words);
    if (tokenScore >= 0) return tokenScore;
    return -1;
  }
  function searchProductsSync(list, term, options){
    const opts = options || {};
    const qn = norm((term||'').trim());
    const cat = opts.category ? norm(opts.category) : null;
    if (!qn) return [];
    const seen = new Set();
    const results = [];
    (Array.isArray(list) ? list : []).forEach(p=>{
      if (!p || !p.name) return;
      if (cat && norm(p.section||'') !== cat) return;
      const score = scoreProduct(p, qn);
      if (score < 0) return;
      const key = String(p.id || p.slug || p.name).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      results.push({ product:p, score });
    });
    results.sort((a,b)=> b.score - a.score || String(a.product.name||'').localeCompare(String(b.product.name||'')));
    return results.map(r=>r.product);
  }
  function searchProducts(term, options){
    return ensureProducts().then(list => searchProductsSync(list, term, options));
  }

  // --- Helpers to focus elements on page load ---
  function findAndFocus(query){
    const q = norm(query);
    const cards = document.querySelectorAll('.product-card');
    let first;
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
      if (norm(nameText).includes(q)) { first = c; }
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
    let tries = 0; const max = 20;
    const timer = setInterval(()=>{
      tries++;
      if (findAndFocus(q) || tries>=max) clearInterval(timer);
    }, 200);
  }

  // --- Suggestions UI ---
  function renderSuggestions(root, items, q){
    if (!SUGGEST_BOX) return;
    const term = (q || '').trim();
    if (!items || !items.length) {
      SUGGEST_BOX.innerHTML = term ? `<div class="search-suggestion empty">No se encontraron resultados para "${term}"</div>` : '';
      SUGGEST_BOX.style.display = term ? 'block' : 'none';
      SUGGEST_INDEX=-1;
      return;
    }
    const qn = norm(term);
    const hi = (text)=>{
      const t = String(text||'');
      if (!qn) return t;
      const i = norm(t).indexOf(qn);
      if (i<0) return t;
      return t.substring(0,i) + '<strong>' + t.substring(i, i+term.length) + '</strong>' + t.substring(i+term.length);
    };
    SUGGEST_INDEX = -1;
    SUGGEST_BOX.innerHTML = items.map(it=>{
      return `<div class="search-suggestion" data-href="${it.href}"><i class="fas fa-search"></i><div><div class="t">${hi(it.name)}</div><small>${it.type||''}</small></div></div>`;
    }).join('');
    SUGGEST_BOX.style.display='block';
    SUGGEST_BOX.querySelectorAll('.search-suggestion').forEach((el)=>{
      el.addEventListener('mousedown', (e)=>{ // mousedown para que no pierda foco antes del click
        e.preventDefault();
        const href = el.dataset.href;
        if (href) location.href = href;
      });
    });
  }
  function buildCandidates(q){
    const qn = norm(q);
    if (!qn) return [];
    const dedup = new Set();
    const list = (PRODUCTS||[]).map(p=>{
      const slug = slugify(p.name||'');
      const nameClean = globalFixUtf8(p.name || '');
      return { name: p.name||'', type: p.section ? String(p.section).toUpperCase() : (p.type||''), slug, href: buildDetailUrl(p, slug, nameClean), product:p };
    });
    const scored = list.map(it=>{
      const score = scoreProduct(it.product, qn);
      return { it, score };
    }).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score);
    const unique = [];
    for (let i=0; i<scored.length && unique.length<8; i++){
      const key = String(scored[i].it.slug || scored[i].it.name).toLowerCase();
      if (dedup.has(key) || !scored[i].it.name) continue;
      dedup.add(key);
      unique.push(scored[i].it);
    }
    return unique;
  }

  function wireForm(){
    const form = document.getElementById('global-search-form');
    if (!form) return;
    injectSuggestStyles();
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const input = form.querySelector('input[name="q"]');
      const q = (input && input.value || '').trim();
      if (!q) return;
      const active = SUGGEST_INDEX>=0 ? SUGGEST_BOX.querySelectorAll('.search-suggestion')[SUGGEST_INDEX] : null;
      if (active) {
        const href = active.dataset.href;
        if (href) {
          location.href = href;
        }
        return;
      }
      const base = location.pathname.endsWith('index.html') ? 'index.html' : 'index.html';
      location.href = base + '?q=' + encodeURIComponent(q);
    });
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
      if (q.length < 2) { renderSuggestions(form, [], q); return; }
      debounce = setTimeout(()=>{
        ensureProducts().then(()=>{ renderSuggestions(form, buildCandidates(q), q); });
      }, 200);
    });
    input.addEventListener('keydown', (e)=>{
      const items = SUGGEST_BOX && SUGGEST_BOX.querySelectorAll('.search-suggestion');
      if (!items || !items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); SUGGEST_INDEX = (SUGGEST_INDEX+1) % items.length; items.forEach((el,i)=>el.classList.toggle('active', i===SUGGEST_INDEX)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); SUGGEST_INDEX = (SUGGEST_INDEX-1+items.length) % items.length; items.forEach((el,i)=>el.classList.toggle('active', i===SUGGEST_INDEX)); }
      if (e.key === 'Escape') { renderSuggestions(form, [], ''); }
      if (e.key === 'Enter' && SUGGEST_INDEX>=0) { e.preventDefault(); const el = items[SUGGEST_INDEX]; el && el.dispatchEvent(new Event('mousedown', {bubbles:true})); }
    });
    document.addEventListener('click', (e)=>{ if (!form.contains(e.target)) renderSuggestions(form, [], ''); });
  }
  document.addEventListener('DOMContentLoaded', ()=>{ wireForm(); runIfNeeded(); });
  window.romixSearch = {
    run: runIfNeeded,
    focus: findAndFocus,
    slug: slugify,
    search: searchProducts,
    searchInList: searchProductsSync,
    ensure: ensureProducts
  };
})();

// Inject minimal styles for suggestions to keep contrast and layout consistent
function injectSuggestStyles(){
  if (document.getElementById('romix-search-style')) return;
  const style = document.createElement('style');
  style.id = 'romix-search-style';
  style.textContent = `
    .search-suggestions{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #dee2e6;border-radius:10px;box-shadow:0 10px 24px rgba(0,0,0,.12);padding:6px 0;z-index:2000;max-height:360px;overflow:auto}
    .search-suggestion{display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;color:#212529;}
    .search-suggestion .t{font-weight:800;line-height:1.2;}
    .search-suggestion small{display:block;color:#6c757d;font-weight:700;font-size:.85rem;margin-top:2px;letter-spacing:.3px}
    .search-suggestion:hover,.search-suggestion.active{background:#f8f9fa}
    .search-suggestion i{color:#6c757d;}
    .search-suggestion.empty{cursor:default;font-weight:700;}
  `;
  document.head.appendChild(style);
}

