"""Cama musical calma (pad + sub + brilho), sintetizada com numpy, para peças sem voz.
uso: python3 synth_bed.py acordes.json DURACAO saida.wav
acordes.json = [[segundo, [freq1, freq2, ...], brilho0a1], ...]  (o acorde vale até o próximo)
Saída estéreo 48 kHz 24 bits, pico -14 dBFS. Volume final se acerta na mixagem."""
import sys, json, wave, numpy as np
SR = 48000
chords = json.load(open(sys.argv[1])); dur = float(sys.argv[2]); out = sys.argv[3]
n = int(dur * SR); t = np.arange(n) / SR
rng = np.random.default_rng(3)

def lp(x, fc):  # one-pole com corte variável no tempo (vetorizado por blocos curtos)
    y = np.empty_like(x); acc = 0.0
    fc = np.broadcast_to(fc, x.shape)
    a = np.exp(-2 * np.pi * fc / SR)
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc; y[i] = acc
    return y

def saw(f, ph):
    return 2 * ((f * t + ph) % 1.0) - 1

L = np.zeros(n); R = np.zeros(n)
XF = 1.4  # cruzamento entre acordes (s)
for k, (t0, freqs, bright) in enumerate(chords):
    t1 = chords[k + 1][0] if k + 1 < len(chords) else dur
    env = np.clip((t - t0 + XF / 2) / XF, 0, 1) * np.clip((t1 + XF / 2 - t) / XF, 0, 1)
    env = env * env * (3 - 2 * env)
    if not env.any():
        continue
    voiceL = np.zeros(n); voiceR = np.zeros(n)
    for j, f in enumerate(freqs):
        for d, side in ((-0.11, 0), (0.0, 2), (0.13, 1)):
            ff = f * (2 ** (d / 12))
            s = saw(ff, rng.random()) * (0.9 if d == 0 else 0.6)
            if side in (0, 2): voiceL += s
            if side in (1, 2): voiceR += s
    cut = 380 + 900 * bright
    voiceL = lp(lp(voiceL, cut), cut * 1.4); voiceR = lp(lp(voiceR, cut), cut * 1.4)
    root = min(freqs)
    while root > 70: root /= 2
    sub = np.sin(2 * np.pi * root * t) * 0.9
    shimmer = (np.sin(2 * np.pi * max(freqs) * 2 * t) * 0.06 + np.sin(2 * np.pi * max(freqs) * 3 * t + 1.0) * 0.03) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * t)) * bright
    L += env * (voiceL * 0.16 + sub * 0.22 + shimmer)
    R += env * (voiceR * 0.16 + sub * 0.22 + shimmer)

# respiração lenta do volume e entrada/saída macias
breath = 0.85 + 0.15 * np.sin(2 * np.pi * 0.09 * t)
fade = np.clip(t / 2.2, 0, 1) ** 2 * np.clip((dur - t) / 2.0, 0, 1)
L *= breath * fade; R *= breath * fade

# reverb: resposta sintética (ruído com queda de 2,8 s), por FFT
ir_n = int(3.2 * SR); ti = np.arange(ir_n) / SR
irL = rng.standard_normal(ir_n) * np.exp(-ti / 0.9); irR = rng.standard_normal(ir_n) * np.exp(-ti / 0.9)
irL = lp(irL, 4200); irR = lp(irR, 4200)
irL /= np.sqrt((irL ** 2).sum()); irR /= np.sqrt((irR ** 2).sum())
def conv(x, ir):
    m = 1 << int(np.ceil(np.log2(len(x) + len(ir))))
    return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:len(x)]
wetL = conv(L, irL); wetR = conv(R, irR)
L = L * 0.7 + wetL * 0.55; R = R * 0.7 + wetR * 0.55
st = np.stack([L, R], 1)
st = st / (np.abs(st).max() + 1e-9) * (10 ** (-14 / 20))
d = (np.clip(st, -1, 1) * 8388607).astype(np.int32)
b = bytearray()
for v in d.reshape(-1):
    b += int(v).to_bytes(4, 'little', signed=True)[:3]
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(3); w.setframerate(SR); w.writeframes(bytes(b))
print('ok', out, f'{dur:.2f}s')
