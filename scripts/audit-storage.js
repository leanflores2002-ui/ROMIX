const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const {audit,walk} = require('./find-duplicate-assets');
const phase = process.argv[2] || 'before';
if (!['before','after'].includes(phase)) throw Error('Expected before or after');
const baselineCommit = cp.execFileSync('git',['merge-base','main','HEAD'],{encoding:'utf8'}).trim();
const tracked = cp.execFileSync('git',['ls-tree','-r','--name-only','-z',baselineCommit]).toString().split('\0').filter(f=>f && fs.existsSync(f));
const source = tracked.filter(f=>/\.(html|css|js|json|jsx|ts|tsx|py|toml)$/.test(f) && !f.includes('lock')).map(f=>({path:f,text:fs.readFileSync(f,'utf8')}));
const assets = audit().map(a=>{
  const relative=a.path.replace('frontend/public/','');
  const refs=source.filter(s=>s.text.includes(relative) || s.text.includes(path.basename(a.path))).map(s=>s.path);
  const classification=refs.length?'USED':/images\/(products|thumbs|mobile)\//.test(a.path)?'DYNAMIC':'UNKNOWN';
  return {...a,referenced:refs.length>0,references:refs,classification,actionSuggested:'KEEP; optimize in place only',safeToDelete:false};
});
const files=tracked.map(p=>({path:p,size:fs.statSync(p).size}));
const folders={};
for(const f of files){let d=path.posix.dirname(f.path);while(d!=='.'){folders[d]=(folders[d]||0)+f.size;d=path.posix.dirname(d);}}
const physical={};
for(const root of ['.git','node_modules','frontend','frontend/public','frontend/public/images','frontend/public/images/optimized','frontend/public/videos']) physical[root]=walk(root).reduce((n,f)=>n+fs.statSync(f).size,0);
const report={phase,baselineCommit,createdAt:new Date().toISOString(),scope:'Working-tree sizes of files tracked at branch base; physical directories reported separately; added tooling and audit outputs excluded',fileCount:files.length,totalBytes:files.reduce((n,f)=>n+f.size,0),physical,top200Files:files.sort((a,b)=>b.size-a.size).slice(0,200),top50Folders:Object.entries(folders).sort((a,b)=>b[1]-a[1]).slice(0,50),thresholds:Object.fromEntries([1,5,10,50].map(m=>[m+'MB',files.filter(f=>f.size>m*1000000)])),gitObjects:cp.execFileSync('git',['count-objects','-vH']).toString(),assets};
fs.writeFileSync(`storage-audit-${phase}.json`,JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(`storage-audit-${phase}.txt`,JSON.stringify({...report,assets:undefined},null,2)+'\n');
console.log(JSON.stringify({phase,fileCount:report.fileCount,totalBytes:report.totalBytes,physical},null,2));
