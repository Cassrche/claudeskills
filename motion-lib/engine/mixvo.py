"""Como mix.py, mais uma trilha de locução: os efeitos abaixam (sidechain) quando a voz fala.
uso: mixvo.py cues.json sfx_dir dur out.wav TARGET vo.json   (vo.json = [[segundo, caminho, volume], ...])"""
import json, subprocess, sys, re
cues_path, sfx_dir, dur, out, TARGET, vo_path = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4], sys.argv[5], sys.argv[6]
cues, vo = json.load(open(cues_path)), json.load(open(vo_path))
args, chains = [], []
def add(path, t, v, label, trim=None):
    k = len(args) // 2
    args.extend(['-i', path])
    ch = f'[{k}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo'
    if trim:
        ch += f',atrim=0:{trim},afade=t=out:st={max(trim - 0.18, 0)}:d=0.18'
    chains.append(ch + f',volume={v},adelay={int(round(t * 1000))}:all=1[{label}]')
for i, c in enumerate(cues):
    add(f'{sfx_dir}/{c[1]}', c[0], c[2], f's{i}', c[3] if len(c) > 3 else None)
for i, c in enumerate(vo):
    add(c[1], c[0], c[2], f'v{i}')
sfx = ''.join(f'[s{i}]' for i in range(len(cues)))
vox = ''.join(f'[v{i}]' for i in range(len(vo)))
base = ';'.join(chains) + (
    f';{sfx}amix=inputs={len(cues)}:normalize=0:dropout_transition=0,apad,atrim=0:{dur}[sfx]'
    f';{vox}amix=inputs={len(vo)}:normalize=0:dropout_transition=0,apad,atrim=0:{dur},asplit=2[vok][vom]'
    f';[sfx][vok]sidechaincompress=threshold=0.02:ratio=5:attack=12:release=380:knee=4[sfxd]'
    f';[sfxd][vom]amix=inputs=2:normalize=0,alimiter=limit=0.9:attack=2:release=60')
p1 = subprocess.run(['ffmpeg', '-hide_banner', '-y', *args, '-filter_complex', base + f',loudnorm=I={TARGET}:TP=-1.2:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
m = json.loads(re.findall(r'\{[^{}]*"input_i"[^{}]*\}', p1.stderr)[-1])
ln = (f"loudnorm=I={TARGET}:TP=-1.2:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
      f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args, '-filter_complex', base + ',' + ln + ',aresample=48000', '-c:a', 'pcm_s24le', out], check=True)
print('cues', len(cues), 'vo', len(vo), 'measured_I', m['input_i'], 'TP', m['input_tp'])
