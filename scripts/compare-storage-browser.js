const fs=require('node:fs');
const before=JSON.parse(fs.readFileSync('storage-browser-before.json'));
const after=JSON.parse(fs.readFileSync('storage-browser-after.json'));
const regressions=[];
if(before.length!==27||after.length!==27)regressions.push({reason:'Expected 27 page/viewport checks in each run'});
for(const a of after){
 const b=before.find(x=>x.route===a.route&&x.viewport.width===a.viewport.width);
 if(!b){regressions.push({route:a.route,reason:'Missing baseline'});continue;}
 const problems={
  errors:a.errors.filter(e=>!b.errors.includes(e)),
  responses:a.failed.filter(f=>!b.failed.some(g=>f.url===g.url&&f.status===g.status)),
  brokenImages:a.state.brokenVisibleImages.filter(s=>!b.state.brokenVisibleImages.includes(s)),
  accessibility:a.accessibility.filter(v=>v.count>(b.accessibility.find(w=>v.id===w.id)?.count||0)),
  overflow:a.state.overflow&&!b.state.overflow,
  blank:a.state.textLength<100
 };
 if(Object.values(problems).some(v=>Array.isArray(v)?v.length:v))regressions.push({route:a.route,width:a.viewport.width,...problems});
}
const report={beforeChecks:before.length,afterChecks:after.length,regressions,scope:'Local static server. Existing API 404s and existing axe findings remain baseline limitations.'};
fs.writeFileSync('storage-browser-comparison.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(regressions.length)process.exitCode=1;
