(function(root){
  'use strict';
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').trim();
  const stop = new Set('hola quiero quisiera busco tenes tienen hay precio precios cuanto cuesta sale vale color colores talle talles en de del la el las los un una para por favor me podes mostrar prenda producto disponible disponibilidad stock y que es saber ver'.split(' '));
  const aliases = {presio:'precio',presios:'precios',calza:'calzas',remera:'remeras',pantalon:'pantalones',buzo:'buzos',nino:'ninos',nina:'ninos',dama:'mujer',damas:'mujer',caballero:'hombre'};
  function words(s){return norm(s).split(/\s+/).map(w=>aliases[w]||w).filter(w=>w&&!stop.has(w));}
  function near(a,b){if(a===b)return true;if(a.length<5||b.length<5||Math.abs(a.length-b.length)>1)return false;let i=0,j=0,e=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++e>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return e+(a.length-i)+(b.length-j)<=1;}
  function search(catalog,query){const tokens=words(query);if(!tokens.length)return [];return catalog.map(p=>{const text=words([p.name,p.type,p.section,...p.colors,...p.sizes].join(' '));const hits=tokens.filter(t=>text.some(w=>near(t,w)));return {p,score:hits.length};}).filter(x=>x.score===tokens.length).sort((a,b)=>b.score-a.score).slice(0,5).map(x=>x.p);}
  const api={norm,search};
  if(typeof module==='object'&&module.exports){module.exports=api;return;}
  if(!root.document||document.getElementById('romix-assistant'))return;
  const box=document.createElement('div');box.id='romix-assistant';
  box.innerHTML='<button class="ra-launch" type="button" aria-expanded="false" aria-controls="ra-panel">¿Te ayudo?</button><section id="ra-panel" class="ra-panel" aria-label="Asistente del catálogo ROMIX" hidden><header><div><strong>Asistente ROMIX</strong><small>Consultá nuestro catálogo</small></div><button type="button" class="ra-close" aria-label="Cerrar asistente">✕</button></header><div class="ra-log" role="log" aria-live="polite" aria-relevant="additions"></div><form><label class="ra-label" for="ra-query">¿Qué prenda buscás?</label><div class="ra-input"><input id="ra-query" maxlength="250" autocomplete="off" placeholder="Ej.: calzas negras talle 4"><button type="submit">Enviar</button></div></form><small class="ra-note">Respuestas automáticas del catálogo. No envíes datos personales.</small></section>';
  document.body.append(box);
  const launch=box.querySelector('.ra-launch'), panel=box.querySelector('.ra-panel'),log=box.querySelector('.ra-log'),input=box.querySelector('input'),form=box.querySelector('form');
  let catalog=null,pending=null,selection=null;
  function say(text,user=false){const p=document.createElement('p');p.className=user?'ra-user':'ra-bot';p.textContent=text;log.append(p);while(log.children.length>40)log.firstElementChild.remove();log.scrollTop=log.scrollHeight;return p;}
  function link(parent,text,href){const a=document.createElement('a');a.textContent=text;a.href=href;parent.append(document.createElement('br'),a);}
  function contact(){const p=say('La dueña confirma disponibilidad, pedidos, cambios y pagos por WhatsApp.');link(p,'Hablar con ROMIX','https://wa.me/5491154272065');}
  async function load(){if(catalog)return catalog;if(!pending)pending=fetch('/assets/data/assistant-catalog.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('catalog');return r.json();}).then(data=>{if(!Array.isArray(data))throw new Error('catalog');catalog=data;return data;}).finally(()=>{pending=null;});return pending;}
  function close(){panel.hidden=true;launch.setAttribute('aria-expanded','false');launch.focus();}
  launch.addEventListener('click',()=>{panel.hidden=!panel.hidden;launch.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)input.focus();});
  box.querySelector('.ra-close').addEventListener('click',close);
  box.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)close();});
  say('¡Hola! Soy el asistente automático de ROMIX. Decime qué prenda buscás y te muestro precios, talles y colores publicados. El stock se confirma por WhatsApp.');
  form.addEventListener('submit',async e=>{e.preventDefault();const query=input.value.trim();if(!query)return;input.value='';say(query,true);const q=norm(query);if(/\b(persona|humano|duena|whatsapp|reclamo|devolucion|cambio|pago|pedido|envio|retiro)\b/.test(q)){contact();return;}if(/^(hola|buenas|gracias|buen dia|buenas tardes|buenas noches)$/.test(q)){say('¿Qué prenda buscás? Podés escribir el nombre, color o talle.');return;}
    const button=form.querySelector('button');button.disabled=true;panel.setAttribute('aria-busy','true');
    try{const data=await load();let results=search(data,query);if(!results.length&&selection&&/\b(precio|presio|talle|talles|color|colores|stock|disponibilidad)\b/.test(q)&&words(query).length===0)results=[selection];
      if(!results.length){selection=null;say('No pude identificar una prenda publicada con esa descripción. Probá con su nombre o categoría, por ejemplo: “calzas mujer”.');link(log.lastElementChild,'Ver todo el catálogo','/catalogo.html');}
      else {selection=results.length===1?results[0]:null;say(results.length===1?'Encontré esta prenda:':'Estas son algunas coincidencias. Abrí una ficha para elegir sus variantes:');for(const p of results){const message=say(p.name+'\n'+p.priceText+'\nTalles publicados: '+(p.sizes.join(', ')||'Consultar')+'\nColores publicados: '+(p.colors.join(', ')||'Consultar'));link(message,'Ver producto',p.href);}say('Las opciones publicadas no garantizan stock ni todas las combinaciones de talle y color. Confirmá disponibilidad con ROMIX.');}
    }catch{say('No pude consultar el catálogo en este momento. Intentá de nuevo o consultanos por WhatsApp.');contact();}finally{button.disabled=false;panel.removeAttribute('aria-busy');log.scrollTop=log.scrollHeight;}
  });
})(typeof window!=='undefined'?window:globalThis);
