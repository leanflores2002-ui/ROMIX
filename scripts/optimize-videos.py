"""Re-encode existing MP4s, preserving public paths. Dry run by default."""
import argparse, hashlib, json, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.storage-tools'))
import imageio_ffmpeg
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--execute',action='store_true')
args=p.parse_args()
report=[]
for file in sorted((ROOT/'frontend/public/videos').glob('*.mp4')):
    candidate=ROOT/'.storage-tools'/('candidate-'+file.name)
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-y','-i',str(file),
        '-map','0:v:0','-map','0:a?','-c:v','libx264','-crf','27','-preset','medium',
        '-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',str(candidate)],check=True)
    before=file.stat().st_size; after=candidate.stat().st_size
    eligible=after<before*.9
    entry={'path':file.relative_to(ROOT).as_posix(),'beforeBytes':before,'afterBytes':after if eligible else before,
           'sha256Before':hashlib.sha256(file.read_bytes()).hexdigest(),'eligible':eligible,'executed':args.execute and eligible}
    report.append(entry)
    (ROOT/'media-video-plan.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    # Decode the entire candidate before accepting it.
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-i',str(candidate),'-f','null','-'],check=True)
    if args.execute and eligible:
        candidate.replace(file)
    else:
        candidate.unlink()
    print(json.dumps(entry),flush=True)
