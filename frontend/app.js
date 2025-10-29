/*
  TODO: Cambiar API_BASE cuando exista backend
  - Cuando se monte el backend, apuntar API_BASE a la ruta base del API.
  - La UI intentará usar /api/products y, si falla, hará fallback a products.json.
*/
(function(){
  'use strict';

  // --- Config ---
  const API_BASE = ''; // e.g. '/api' cuando exista backend
  const PAGE_SIZE_DEFAULT = 24;

  // --- Utils ---
  const utils = {
    esc(s){ return String(s==null? '': s); },
    norm(s){
      try { return String(s||'').normalize('NFD').replace(/\p{Diacritic}+/gu,'').toLowerCase(); }
      catch { return String(s||'').toLowerCase(); }
    },
    slugify(s){
      return utils.norm(String(s||''))
        .replace(/[^a-z0-9]+/g,'-')
        .replace(/^-+|-+$/g,'');
    },
    debounce(fn, wait){
      let t; return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), wait); };
    },
    placeholder(){
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#f8f9fb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#adb5bd" font-family="Segoe UI, sans-serif" font-size="22">Imagen no disponible</text></svg>';
      return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
    }
  };

  // --- Cart (localStorage) ---
  function safeGetCart(){ try { return JSON.parse(localStorage.getItem('cart')||'[]'); } catch { return []; } }
  function safeSetCart(v){ try { localStorage.setItem('cart', JSON.stringify(v)); } catch {} }
  function updateCartCount(){
    const c = safeGetCart();
    const n = c.reduce((t,i)=> t + (i.quantity||0), 0);
    const el = document.getElementById('cart-count');
    if (el) el.textContent = String(n);
  }
  function quickAdd(product){
    const cart = safeGetCart();
    const color = (product.colors && product.colors[0] && product.colors[0].name) || 'Único';
    let size = 'U';
    if (Array.isArray(product.sizes) && product.sizes.length){
      const available = product.sizes.find(s => !/out|unavail/i.test(String(s.status||''))) || product.sizes[0];
      size = String(available.size || 'U');
    }
    const price = Number(product.price||0);
    cart.push({ id: Date.now(), name: product.name, type: product.type || '', color, size, quantity: 1, price, subtotal: price });
    safeSetCart(cart);
    updateCartCount();
    try { alert('Listo! Se agregó al carrito.'); } catch {}
  }

  // --- State (URL) ---
  const state = {
    allowedSections: new Set(['mujer','hombre','ninos']),
    fromURL(){
      const u = new URL(window.location.href);
      const p = u.searchParams;
      let section = (p.get('section')||'mujer').toLowerCase();
      if (!state.allowedSections.has(section)) section = 'mujer';
      const q = (p.get('q')||'').trim();
      const sort = (p.get('sort')||'relevance').toLowerCase();
      const page = Math.max(1, parseInt(p.get('page')||'1', 10) || 1);
      const pageSize = Math.max(1, parseInt(p.get('pageSize')||String(PAGE_SIZE_DEFAULT), 10) || PAGE_SIZE_DEFAULT);
      return { section, q, sort, page, pageSize };
    },
    toURL(s){
      const u = new URL(window.location.href);
      const p = u.searchParams;
      p.set('section', s.section);
      if (s.q) p.set('q', s.q); else p.delete('q');
      if (s.sort && s.sort!=='relevance') p.set('sort', s.sort); else p.delete('sort');
      if (s.page && s.page!==1) p.set('page', String(s.page)); else p.delete('page');
      if (s.pageSize && s.pageSize!==PAGE_SIZE_DEFAULT) p.set('pageSize', String(s.pageSize)); else p.delete('pageSize');
      return u.pathname + '?' + p.toString();
    }
  };

  // --- API ---
  const api = {
    async fetchProducts({ section, q, sort, page, pageSize }){
      // Try API first
      const params = new URLSearchParams();
      if (section) params.set('section', section);
      if (q) params.set('q', q);
      if (sort) params.set('sort', sort);
      if (page) params.set('page', String(page));
      if (pageSize) params.set('pageSize', String(pageSize));
      const apiUrl = API_BASE + '/api/products?' + params.toString();
      try {
        const r = await fetch(apiUrl, { credentials:'same-origin' });
        if (r.ok) {
          const data = await r.json();
          if (data && Array.isArray(data.items) && typeof data.total === 'number') {
            return data;
          }
        }
      } catch {}

      // Fallback to products.json (array)
      try {
        const r = await fetch('products.json', { credentials:'same-origin' });
        const list = await r.json();
        const all = Array.isArray(list) ? list : [];
        let items = all.slice();
        if (section) items = items.filter(p => String(p.section||'').toLowerCase() === section);
        if (q) {
          const qn = utils.norm(q);
          items = items.filter(p => utils.norm(p.name||'').includes(qn) || utils.norm(p.type||'').includes(qn));
        }
        const sortKey = (sort||'relevance');
        if (sortKey === 'price-asc') items.sort((a,b)=> (Number(a.price||0) - Number(b.price||0)));
        else if (sortKey === 'price-desc') items.sort((a,b)=> (Number(b.price||0) - Number(a.price||0)));
        else if (sortKey === 'newest') items.sort((a,b)=>{
          const ad = Date.parse(a.created_at||a.createdAt||0) || 0;
          const bd = Date.parse(b.created_at||b.createdAt||0) || 0;
          return bd - ad;
        });
        else if (sortKey === 'relevance' && q) {
          const qn = utils.norm(q);
          items = items.map(p=>{
            const name = utils.norm(p.name||'');
            const type = utils.norm(p.type||'');
            let score = -1;
            if (name.startsWith(qn)) score = 100 - name.length;
            else if (name.includes(qn)) score = 80 - name.indexOf(qn);
            else if (type.includes(qn)) score = 60 - type.indexOf(qn);
            return { p, score };
          }).filter(x=>x.score>=0).sort((a,b)=> b.score - a.score).map(x=>x.p);
        }
        const total = items.length;
        const start = (Math.max(1, page)-1) * pageSize;
        const end = start + pageSize;
        const pageItems = items.slice(start, end);
        return { items: pageItems, total };
      } catch (e) {
        console.error('[api.fallback] Error', e);
        return { items: [], total: 0 };
      }
    }
  };

  // --- Render ---
  const render = {
    card(p){
      const imgSrc = p.image || (p.images && (p.images['Negro'] || Object.values(p.images)[0])) || utils.placeholder();
      const price = Number(p.price||0).toLocaleString('es-AR');
      const slug = utils.slugify(p.name);
      const article = document.createElement('article');
      article.className = 'card';
      article.setAttribute('aria-label', utils.esc(p.name));

      const thumb = document.createElement('div'); thumb.className = 'thumb';
      const img = document.createElement('img'); img.src = imgSrc; img.alt = utils.esc(p.name); img.width = 600; img.height = 400; img.onerror = () => { img.onerror = null; img.src = utils.placeholder(); };
      thumb.appendChild(img);
      const badgeText = p.badge ? p.badge : (p.type || '');
      if (badgeText) { const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = String(badgeText); thumb.appendChild(badge); }

      const body = document.createElement('div'); body.className = 'body';
      const title = document.createElement('div'); title.className = 'title'; title.textContent = utils.esc(p.name);
      const subtitle = document.createElement('div'); subtitle.className = 'subtitle';
      const sectionNice = p.section ? (String(p.section).charAt(0).toUpperCase() + String(p.section).slice(1)) : '';
      subtitle.textContent = sectionNice + (p.type ? (sectionNice? ' · ' : '') + p.type : '');
      const row = document.createElement('div'); row.className = 'row';
      const priceEl = document.createElement('div'); priceEl.className = 'price'; priceEl.textContent = '$' + price;
      const stockEl = document.createElement('div'); stockEl.className = 'stock'; stockEl.textContent = 'Disponible';
      const stockSm = document.createElement('small'); stockSm.textContent = 'Stock: —'; stockEl.appendChild(stockSm);
      row.appendChild(priceEl); row.appendChild(stockEl);

      const actions = document.createElement('div'); actions.className = 'actions';
      const details = document.createElement('a'); details.className = 'btn'; details.href = 'product.html?slug=' + encodeURIComponent(slug); details.setAttribute('aria-label', 'Ver detalles de ' + utils.esc(p.name)); details.textContent = 'Ver Detalles';
      const add = document.createElement('button'); add.className = 'btn btn-primary'; add.type = 'button'; add.textContent = 'Agregar'; add.addEventListener('click', () => quickAdd(p));
      actions.appendChild(details); actions.appendChild(add);

      body.appendChild(title); body.appendChild(subtitle); body.appendChild(row); body.appendChild(actions);
      article.appendChild(thumb); article.appendChild(body);
      return article;
    },
    list(products){
      const grid = document.getElementById('grid');
      grid.innerHTML = '';
      products.forEach(p => grid.appendChild(render.card(p)));
    }
  };

  // --- UI & Router ---
  const router = {
    current: null,
    async load(s){
      router.current = s;
      // Sync controls
      const qInput = document.getElementById('search');
      const sortSel = document.getElementById('sort');
      if (qInput) qInput.value = s.q || '';
      if (sortSel) sortSel.value = s.sort || 'relevance';
      // Highlight current section
      ['mujer','hombre','ninos'].forEach(sec => {
        const el = document.getElementById('nav-' + sec);
        if (el) el.setAttribute('aria-current', sec===s.section ? 'page' : 'false');
      });
      // Fetch
      const { items, total } = await api.fetchProducts(s);
      render.list(items);
      // Summary & pagination
      const totalPages = Math.max(1, Math.ceil(total / s.pageSize));
      const summary = document.getElementById('summary');
      if (summary) summary.textContent = `Mostrando ${items.length} de ${total} productos — Página ${s.page} de ${totalPages}`;
      const pageInd = document.getElementById('page-indicator');
      if (pageInd) pageInd.textContent = String(s.page);
      const prev = document.getElementById('prev-page');
      const next = document.getElementById('next-page');
      if (prev) prev.disabled = (s.page<=1);
      if (next) next.disabled = (s.page>=totalPages);
      // Prefetch next page (HTML) to speed navigation
      try {
        const head = document.querySelector('head');
        const old = document.querySelector('link[rel="prefetch"][data-kind="next-page"]');
        if (old) old.remove();
        if (s.page < totalPages) {
          const ns = { ...s, page: s.page + 1 };
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = state.toURL(ns);
          link.as = 'document';
          link.setAttribute('data-kind','next-page');
          head.appendChild(link);
        }
      } catch {}
    },
    navigate(s){
      const url = state.toURL(s);
      window.history.pushState(s, '', url);
      router.load(s);
    },
    init(){
      const s = state.fromURL();
      // Bind controls
      const qInput = document.getElementById('search');
      const sortSel = document.getElementById('sort');
      const prev = document.getElementById('prev-page');
      const next = document.getElementById('next-page');
      if (qInput) qInput.addEventListener('input', utils.debounce(()=>{
        const cur = { ...router.current, q: qInput.value.trim(), page: 1 };
        router.navigate(cur);
      }, 120));
      if (sortSel) sortSel.addEventListener('change', ()=>{
        const cur = { ...router.current, sort: sortSel.value, page: 1 };
        router.navigate(cur);
      });
      if (prev) prev.addEventListener('click', ()=>{
        const cur = { ...router.current, page: Math.max(1, (router.current.page||1)-1) };
        router.navigate(cur);
      });
      if (next) next.addEventListener('click', ()=>{
        const cur = { ...router.current, page: (router.current.page||1)+1 };
        router.navigate(cur);
      });
      window.addEventListener('popstate', ()=> router.load(state.fromURL()));
      updateCartCount();
      router.load(s);
    }
  };

  // Expose minimal API for debugging/testing if needed
  window.romixApp = { api, state, render, router };
  // Init
  window.addEventListener('DOMContentLoaded', router.init);
})();
