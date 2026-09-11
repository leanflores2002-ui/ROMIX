"""Compare recompressed videos to main using ffmpeg SSIM; read-only media check."""
import json,re,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.storage-tools'))
import imageio_ffmpeg
from PIL import Image
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
report=[]
for row in json.loads((ROOT/'media-video-plan.json').read_text()):
    if not row['executed']:
        continue
    relative=row['path'];name=Path(relative).stem
    original=ROOT/'.storage-tools'/f'{name}-reference.mp4'
    original.write_bytes(subprocess.run(['git','show','main:'+relative],check=True,capture_output=True).stdout)
    result=subprocess.run([ffmpeg,'-hide_banner','-i',str(original),'-i',str(ROOT/relative),'-lavfi','ssim','-an','-f','null','-'],capture_output=True,check=True)
    scores=re.findall(r'All:([0-9.]+)',result.stderr.decode('utf8',errors='replace'))
    if not scores:
        raise RuntimeError('SSIM result missing')
    score=float(scores[-1]);report.append({'path':relative,'ssim':score,'passed':score>=0.95})
    frames=[]
    for index,source in enumerate([original,ROOT/relative]):
        frame=ROOT/'.storage-tools'/f'{name}-{index}.png'
        subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-ss','1','-i',str(source),'-frames:v','1',str(frame)],check=True)
        with Image.open(frame) as im:
            thumb=im.convert('RGB');thumb.thumbnail((640,480));frames.append(thumb)
        frame.unlink()
    sample=Image.new('RGB',(1280,480),'white')
    sample.paste(frames[0],(0,0));sample.paste(frames[1],(640,0))
    sample.save(ROOT/f'storage-quality-{name}.png')
    original.unlink()
(ROOT/'storage-video-quality.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report,indent=2))
if not all(r['passed'] for r in report):
    sys.exit(1)
