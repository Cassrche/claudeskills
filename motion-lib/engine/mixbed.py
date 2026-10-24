"""Junta efeitos (já mixados) + cama musical, com a cama N dB abaixo, e normaliza o total.
uso: python3 mixbed.py efeitos.wav cama.wav saida.wav ALVO_LUFS DB_ABAIXO
Grava também cama-ajustada (a cama no volume usado) ao lado da saída, para o Fairlight."""
import json, re, subprocess, sys
fx, bed, out, target, under = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5])
def lufs(f):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', f, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
    return float(json.loads(re.findall(r'\{[^{}]*"input_i"[^{}]*\}', r.stderr)[-1])['input_i'])
fx_i, bed_i = lufs(fx), lufs(bed)
gain = (fx_i - under) - bed_i
bed_adj = out.replace('.wav', '-cama.wav')
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', bed, '-af', f'volume={gain:.2f}dB', '-c:a', 'pcm_s24le', '-ar', '48000', bed_adj], check=True)
base = '[0:a]aformat=sample_rates=48000:channel_layouts=stereo[a];[1:a]aformat=sample_rates=48000:channel_layouts=stereo[b];[a][b]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.9:attack=2:release=60'
p1 = subprocess.run(['ffmpeg', '-hide_banner', '-y', '-i', fx, '-i', bed_adj, '-filter_complex', base + f',loudnorm=I={target}:TP=-1.2:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
m = json.loads(re.findall(r'\{[^{}]*"input_i"[^{}]*\}', p1.stderr)[-1])
ln = (f"loudnorm=I={target}:TP=-1.2:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
      f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', fx, '-i', bed_adj, '-filter_complex', base + ',' + ln + ',aresample=48000', '-c:a', 'pcm_s24le', out], check=True)
print(f'efeitos {fx_i:.1f} LUFS · cama {bed_i:.1f} → {fx_i - under:.1f} LUFS ({gain:+.1f} dB) · total medido {m["input_i"]} → {target}')
