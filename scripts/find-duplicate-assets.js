const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const roots = ['frontend/public/images', 'frontend/public/videos', 'frontend/public/assets'];
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name).replaceAll('\\','/')]);
}
function audit() {
  const seen = new Map();
  return roots.flatMap(walk).map(file => {
    const data = fs.readFileSync(file), hash = crypto.createHash('sha256').update(data).digest('hex');
    const duplicateOf = seen.get(hash) || null;
    if (!duplicateOf) seen.set(hash,file);
    return {path:file,size:data.length,hash,duplicateOf,potentialRecoverableBytes:duplicateOf ? data.length : 0};
  });
}
if (require.main === module) console.log(JSON.stringify(audit(),null,2));
module.exports = {audit,walk};
