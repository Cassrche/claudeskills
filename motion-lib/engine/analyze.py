import sys, glob, os, numpy as np
from scipy.io import wavfile
root = sys.argv[1]
for f in sorted(glob.glob(root + '/*/*.wav')):
    sr, x = wavfile.read(f)
    x = x.astype(np.float64)
    if x.ndim > 1: x = x.mean(1)
    x /= (np.abs(x).max() or 1)
    hop = int(sr * 0.01)
    env = np.array([np.sqrt(np.mean(x[i:i+hop]**2)) for i in range(0, len(x)-hop, hop)])
    db = 20*np.log10(env + 1e-9)
    pk = db.max()
    on = np.argmax(db > pk - 20) * 0.01
    peak = np.argmax(db) * 0.01
    tail = (len(db) - np.argmax(db[::-1] > pk - 30)) * 0.01
    # spectral centroid over loud part
    seg = x[int(on*sr): int(min(tail, on+0.5)*sr)]
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) if len(seg) > 64 else np.zeros(2)
    fr = np.fft.rfftfreq(len(seg), 1/sr) if len(seg) > 64 else np.zeros(2)
    cen = (sp*fr).sum()/(sp.sum() or 1)
    # count transients: rises of >10dB in 30ms
    d = db[3:] - db[:-3]
    hits = np.where((d[1:] > 10) & (d[:-1] <= 10))[0]
    print(f"{os.path.relpath(f, root):58s} sr={sr} on={on:.2f} peak={peak:.2f} audible_end={tail:.2f} centroid={cen:5.0f}Hz hits={len(hits)} at={[round(h*0.01,2) for h in hits[:6]]}")
