"""Mixa as cues (segundo, arquivo, volume, corte) num WAV estéreo 48 kHz, com loudnorm em duas passadas."""
import json, subprocess, sys, re
cues_path, sfx_dir, dur, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
TARGET = sys.argv[5] if len(sys.argv) > 5 else "-14"
cues = json.load(open(cues_path))
args, chains = [], []
for k, c in enumerate(cues):
    t, f, v = c[0], c[1], c[2]
    trim = c[3] if len(c) > 3 else None
    args += ['-i', f'{sfx_dir}/{f}']
    ch = f'[{k}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo'
    if trim:
        ch += f',atrim=0:{trim},afade=t=out:st={max(trim - 0.18, 0)}:d=0.18'
    ms = int(round(t * 1000))
    ch += f',volume={v},adelay={ms}:all=1[a{k}]'
    chains.append(ch)
mixin = ''.join(f'[a{k}]' for k in range(len(cues)))
base = ';'.join(chains) + f';{mixin}amix=inputs={len(cues)}:normalize=0:dropout_transition=0,apad,atrim=0:{dur},alimiter=limit=0.9:attack=2:release=60'
p1 = subprocess.run(['ffmpeg', '-hide_banner', '-y', *args, '-filter_complex', base + f',loudnorm=I={TARGET}:TP=-1.2:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
m = json.loads(re.findall(r'\{[^{}]*"input_i"[^{}]*\}', p1.stderr)[-1])
ln = (f"loudnorm=I={TARGET}:TP=-1.2:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
      f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args, '-filter_complex', base + ',' + ln + ',aresample=48000', '-c:a', 'pcm_s24le', out], check=True)
print('cues', len(cues), 'measured_I', m['input_i'], 'TP', m['input_tp'])
