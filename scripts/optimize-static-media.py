"""In-place PNG compression with unchanged URLs, dimensions and alpha.

Dry run by default. Pillow and pngquant are required. No media is deleted. Only candidates
with >=10% savings and RGB PSNR >=38 dB are eligible for --execute.
pngquant additionally requires perceptual quality >=85. Transparent images
and small logos are left untouched. Candidates are cached outside public.
This intentionally retains the PNG format for existing public PNG URLs.
"""
import argparse
import hashlib
import io
import json
import math
from pathlib import Path
import sys
import subprocess
import os
import shutil
from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.storage-tools'))
from PIL import Image, ImageChops, ImageStat

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--execute', action='store_true')
parser.add_argument('--limit', type=int, default=0)
parser.add_argument('--preview', action='store_true', help='Save side-by-side quality samples without replacing originals')
parser.add_argument('--resume', action='store_true')
parser.add_argument('--engine',choices=['pillow','pngquant'],default='pngquant')
args = parser.parse_args()
cache=ROOT/'.storage-tools/media-candidates'
if args.execute:
    plan=json.loads((ROOT/'media-optimization-plan.json').read_text(encoding='utf8'))
    if not (ROOT/'media-optimization-complete.json').exists():
        raise RuntimeError('Complete a full dry run first')
    selected=[r for r in plan if r['eligible']]
    # Validate every input and candidate before changing any file.
    for r in selected:
        file=(ROOT/r['path']).resolve()
        assert file.is_relative_to(ROOT/'frontend/public/images')
        assert hashlib.sha256(file.read_bytes()).hexdigest()==r['sha256Before']
        candidate=cache/(r['sha256Before']+'.png')
        assert hashlib.sha256(candidate.read_bytes()).hexdigest()==r['sha256After']
        with Image.open(candidate) as check:
            check.load()
            assert list(check.size)==r['dimensions'] and check.format=='PNG'
    for r in selected:
        (cache/(r['sha256Before']+'.png')).replace(ROOT/r['path'])
        r['executed']=True
    (ROOT/'media-optimization-result.json').write_text(json.dumps(plan,indent=2),encoding='utf8')
    print(json.dumps({'executed':len(selected),'savedBytes':sum(r['beforeBytes']-r['afterBytes'] for r in selected)}))
    sys.exit(0)
if not args.preview:
    cache.mkdir(parents=True,exist_ok=True)
    (ROOT/'media-optimization-complete.json').unlink(missing_ok=True)
report = []
previous = {}
if args.resume and (ROOT/'media-optimization-plan.json').exists():
    previous={r['path']:r for r in json.loads((ROOT/'media-optimization-plan.json').read_text(encoding='utf8'))}
files = sorted((ROOT / 'frontend/public/images').rglob('*.png'))
if args.limit:
    files = sorted(files, key=lambda p: p.stat().st_size, reverse=True)[:args.limit]
def prepare(item):
    index,file=item
    before = file.read_bytes()
    if len(before) < 400_000:
        return None
    saved=previous.get(file.relative_to(ROOT).as_posix())
    if saved and saved.get('engine')==args.engine and hashlib.sha256(before).hexdigest()==saved['sha256Before']:
        if not saved['eligible'] or (cache/(saved['sha256Before']+'.png')).exists():
            return saved
    with Image.open(io.BytesIO(before)) as original:
        original.load()
        if getattr(original, 'n_frames', 1) != 1:
            return None
        # Skip transparency and non-RGB photos rather than changing alpha.
        if original.mode == 'RGBA' and original.getextrema()[3] != (255, 255):
            return None
        if original.mode not in ('RGB', 'RGBA'):
            return None
        rgb = original.convert('RGB')
        if args.engine=='pngquant' and not original.info.get('icc_profile'):
            binary=os.environ.get('PNGQUANT_BINARY') or shutil.which('pngquant') or str(ROOT/'.storage-tools/pngquant/node_modules/pngquant-bin/vendor/pngquant.exe')
            result=subprocess.run([binary,'--quality=85-100','--speed','3','--output','-','--',str(file)],capture_output=True,env={**os.environ,'OMP_NUM_THREADS':'1'})
            if result.returncode==99:
                return {'path':file.relative_to(ROOT).as_posix(),'engine':args.engine,'beforeBytes':len(before),'afterBytes':len(before),'sha256Before':hashlib.sha256(before).hexdigest(),'eligible':False,'executed':False,'reason':'pngquant rejected candidate below quality 85'}
            if result.returncode!=0:
                raise RuntimeError(f'pngquant failed ({result.returncode}) for {file.name}')
            candidate=Image.open(io.BytesIO(result.stdout))
            candidate.load()
        else:
            candidate = rgb.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
            candidate = rgb.quantize(palette=candidate, dither=Image.Dither.FLOYDSTEINBERG)
        diff = ImageStat.Stat(ImageChops.difference(rgb, candidate.convert('RGB')))
        mse = sum(v*v for v in diff.rms)/3
        psnr = 99 if mse == 0 else 10*math.log10(255*255/mse)
        buffer = io.BytesIO()
        options = {'optimize': True}
        if original.info.get('icc_profile'):
            options['icc_profile'] = original.info['icc_profile']
        candidate.save(buffer, format='PNG', **options)
        output = buffer.getvalue()
        if args.preview:
            left=rgb.copy(); right=candidate.convert('RGB')
            left.thumbnail((450,650)); right.thumbnail((450,650))
            sample=Image.new('RGB',(900,650),'white')
            sample.paste(left,(0,0));sample.paste(right,(450,0))
            sample.save(ROOT/f'storage-quality-{index}.png')
        eligible = psnr >= 38 and len(output) < len(before)*0.9
        entry = {'path':file.relative_to(ROOT).as_posix(), 'beforeBytes':len(before),
                 'engine':args.engine,
                 'afterBytes':len(output) if eligible else len(before),
                 'sha256Before':hashlib.sha256(before).hexdigest(),
                 'sha256After':hashlib.sha256(output).hexdigest() if eligible else hashlib.sha256(before).hexdigest(),
                 'psnrDb':round(psnr,2), 'dimensions':list(rgb.size),
                 'eligible':eligible, 'executed':bool(args.execute and eligible),
                 'reason':'same URL, PNG format and dimensions; opaque photo only'}
        if not args.preview and eligible:
            (cache/(entry['sha256Before']+'.png')).write_bytes(output)
        return entry

with ThreadPoolExecutor(max_workers=4) as pool:
    for entry in pool.map(prepare,enumerate(files)):
        if entry is None:
            continue
        report.append(entry)
        if not args.preview:
            (ROOT/'media-optimization-plan.json').write_text(json.dumps(report,indent=2),encoding='utf8')
        print(json.dumps(entry), flush=True)
print(json.dumps({'dryRun':not args.execute,'files':len(report),
                  'potentialSavingsBytes':sum(r['beforeBytes']-r['afterBytes'] for r in report)}))
if not args.preview and not args.limit:
    (ROOT/'media-optimization-complete.json').write_text(json.dumps({'files':len(report)}),encoding='utf8')
