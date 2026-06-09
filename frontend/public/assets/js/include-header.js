(function () {
  var CACHE_KEY = 'romix.header.html.v1';
  var CACHE_TS = 'romix.header.ts.v1';
  var MAX_AGE_MS = 1000 * 60 * 60 * 6; // 6h

  function injectHeader(html, mount) {
    if (!mount || !html) return;
    if (document.querySelector('header')) {
      mount.remove();
      return;
    }
    mount.insertAdjacentHTML('beforebegin', html);
    mount.remove();
    document.dispatchEvent(new Event('romix:header-loaded'));
  }

  function readCache() {
    try {
      var html = localStorage.getItem(CACHE_KEY) || '';
      var ts = Number(localStorage.getItem(CACHE_TS) || 0);
      if (!html) return null;
      if (Date.now() - ts > MAX_AGE_MS) return null;
      return html;
    } catch (error) {
      return null;
    }
  }

  function writeCache(html) {
    try {
      localStorage.setItem(CACHE_KEY, html);
      localStorage.setItem(CACHE_TS, String(Date.now()));
    } catch (error) {
      // ignore storage errors
    }
  }

  function fetchHeader() {
    return fetch('partials/header.html', { cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text();
      });
  }

  function loadHeader() {
    var mount = document.getElementById('site-header');
    if (!mount) return;

    var cached = readCache();
    if (cached) {
      injectHeader(cached, mount);
      // refresh in background if header exists
      fetchHeader()
        .then(function (html) {
          if (!html || html === cached) return;
          writeCache(html);
        })
        .catch(function () {});
      return;
    }

    fetchHeader()
      .then(function (html) {
        writeCache(html);
        injectHeader(html, mount);
      })
      .catch(function (error) {
        console.warn('[romix] No se pudo cargar el header', error);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHeader);
  } else {
    loadHeader();
  }
})();
