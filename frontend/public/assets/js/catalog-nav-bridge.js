(function(){
  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('.nav-inline a[data-section]').forEach(function(a){
      a.addEventListener('click', function(e){
        e.preventDefault(); var sec=a.getAttribute('data-section');
        if (window.catalogTabs && typeof window.catalogTabs.select==='function'){
          window.catalogTabs.select(sec);
          var t=document.getElementById('catalog-title'); if (t) t.scrollIntoView({behavior:'smooth', block:'start'});
          try { history.replaceState({}, '', '#'+sec); } catch{}
        }
      });
    });
  });
})();

