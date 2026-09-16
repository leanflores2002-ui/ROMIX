const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {inventory}=require('../scripts/catalog-media');
const publicDir=path.resolve(__dirname,'../frontend/public');
function bytes(dir){return fs.readdirSync(dir,{withFileTypes:true}).reduce((sum,e)=>sum+(e.isDirectory()?bytes(path.join(dir,e.name)):fs.statSync(path.join(dir,e.name)).size),0);}
const refs=inventory();
for (const ref of refs.filter(r=>!r.remote && r.url.startsWith('images/products/'))) {
  const thumb=ref.url.replace('images/products/','images/thumbs/').replace(/\.[^.]+$/,'-thumb.webp');
  assert(fs.existsSync(path.join(publicDir,thumb)), `Missing derived thumbnail: ${thumb}`);
}
assert(refs.length>157,'Catalog media references must be audited');
assert(bytes(publicDir)<750e6,'Public assets exceeded 750 MB: inspect media regression before deploying');
const ignore=fs.readFileSync(path.resolve(__dirname,'../.vercelignore'),'utf8');
assert(ignore.includes('reports/') && ignore.includes('tests/'), 'Deployment excludes audit/test artifacts');
assert(!ignore.includes('frontend/public/images/products'), 'Catalog originals must remain deployed');
const generator=fs.readFileSync(path.resolve(__dirname,'../scripts/generate-images.js'),'utf8');
assert(generator.includes('const WRITE = process.argv.includes("--write")'), 'Bulk media generator must default to dry run');
console.log(`mediaStorageTests: passed (${refs.length} catalog references; ${bytes(publicDir)} public bytes)`);
