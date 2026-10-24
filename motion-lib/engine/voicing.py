"""Mede quanto de uma fala é voz cheia (com tom) e quanto é sussurro/ar.
uso: voicing.py arquivo [inicio fim] ...   ·   voiced < 0.6 costuma soar sussurrado"""
import sys, subprocess, numpy as np
def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(float), 16000
def voicing(x, sr):
    n, hop, res, rms = 640, 160, [], []
    for i in range(0, len(x) - n, hop):
        f = x[i:i + n] * np.hanning(n)
        e = np.sqrt(np.mean(f ** 2))
        if e < 200: continue
        ac = np.correlate(f, f, 'full')[n - 1:]; ac /= ac[0] + 1e-9
        res.append(ac[sr // 400:sr // 80].max()); rms.append(e)
    r = np.array(res)
    return float(np.mean(r > 0.5)), float(np.median(r)), float(20 * np.log10(np.mean(rms) + 1e-9))
args = sys.argv[1:]
x, sr = load(args[0])
spans = [(float(a), float(b)) for a, b in zip(args[1::2], args[2::2])] or [(0, len(x) / sr)]
for a, b in spans:
    v, m, db = voicing(x[int(a * sr):int(b * sr)], sr)
    print(f'{args[0].split("/")[-1]} {a:.2f}-{b:.2f}s voiced={v:.2f} median={m:.2f} nivel={db:.1f}dB')
