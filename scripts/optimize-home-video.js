const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');
const directory = path.resolve(__dirname, '../frontend/public/videos');
const source = path.join(directory, 'Athletes_training_in_industrial_gym_romix.mp4');
async function main() {
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'romix-home-video-'));
  const poster = path.join(temporary, 'poster.png');
  try {
    for (const [name, width, quality] of [['romix-principal', 1280, 25], ['romix-principal-mobile', 768, 27]]) {
      execFileSync(ffmpeg, ['-hide_banner','-loglevel','error','-i',source,'-vf',`scale=${width}:-2`,'-an','-c:v','libx264','-preset','slow','-crf',String(quality),'-profile:v','high','-level','3.1','-pix_fmt','yuv420p','-movflags','+faststart','-y',path.join(directory, name + '.mp4')], { stdio: 'inherit' });
    }
    execFileSync(ffmpeg, ['-hide_banner','-loglevel','error','-ss','4','-i',source,'-frames:v','1','-y',poster], { stdio: 'inherit' });
    const buffer = fs.readFileSync(poster);
    for (const [name, width] of [['romix-principal',1280],['romix-principal-mobile',768]]) {
      await sharp(buffer).resize({width}).webp({quality:78,effort:6}).toFile(path.join(directory,name+'-poster.webp'));
    }
    console.log('Home video derivatives and posters generated; original preserved.');
  } finally {
    if (fs.existsSync(poster)) fs.unlinkSync(poster);
    fs.rmdirSync(temporary);
  }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { main };
