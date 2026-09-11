const fs=require('node:fs');
const crypto=require('node:crypto');
const {walk}=require('./find-duplicate-assets');
const before=JSON.parse(fs.readFileSync('storage-audit-before.json'));
const images=JSON.parse(fs.readFileSync('media-optimization-result.json'));
const videos=JSON.parse(fs.readFileSync('media-video-plan.json'));
const planned=new Map([...images,...videos].filter(r=>r.executed).map(r=>[r.path,r]));
const errors=[];let changed=0;
for(const asset of before.assets){
 if(!fs.existsSync(asset.path)){errors.push(`Missing: ${asset.path}`);continue;}
 const bytes=fs.readFileSync(asset.path);
 const hash=crypto.createHash('sha256').update(bytes).digest('hex');
 if(hash===asset.hash)continue;
 changed++;
 const plan=planned.get(asset.path);
 if(!plan||plan.sha256Before!==asset.hash||plan.afterBytes!==bytes.length||bytes.length>=asset.size){errors.push(`Unexpected change: ${asset.path}`);continue;}
 if(plan.sha256After&&plan.sha256After!==hash)errors.push(`Unexpected output hash: ${asset.path}`);
}
const originalPaths=new Set(before.assets.map(a=>a.path));
const added=['frontend/public/images','frontend/public/videos','frontend/public/assets'].flatMap(walk).filter(p=>!originalPaths.has(p));
if(added.length)errors.push(`Unexpected added assets: ${added.join(', ')}`);
const report={checked:before.assets.length,changed,deleted:before.assets.filter(a=>!fs.existsSync(a.path)).length,added,errors};
fs.writeFileSync('storage-verification.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(errors.length)process.exitCode=1;
