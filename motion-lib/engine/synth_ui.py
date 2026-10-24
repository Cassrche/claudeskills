"""Sons de interface sintetizados (numpy, semente fixa): teclas e varredura suave.
uso: python3 synth_ui.py PASTA_SAIDA
gera key_1..key_6.wav (tecla macia, 0,12 s) e scan_sweep.wav (varredura calma, 3 s)."""
import sys, wave, numpy as np
SR = 48000
out = sys.argv[1]
rng = np.random.default_rng(42)

def save(name, x, peak_db=-6.0):
    x = np.asarray(x, dtype=np.float64)
    x = x / (np.max(np.abs(x)) + 1e-9) * (10 ** (peak_db / 20))
    st = np.stack([x, x], axis=1)
    d = (np.clip(st, -1, 1) * 32767).astype('<i2').tobytes()
    with wave.open(f'{out}/{name}', 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(d)

def onepole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc; y[i] = acc
    return y

def bandnoise(n, lo, hi):
    w = rng.standard_normal(n)
    return onepole_lp(w, hi) - onepole_lp(w, lo)

# teclas: estalo curto (ruído 2 a 6 kHz) + corpo grave amortecido + soltura baixinha
for k in range(6):
    n = int(0.12 * SR); t = np.arange(n) / SR
    f0 = 190 + 26 * k + rng.uniform(-8, 8)
    click = bandnoise(n, 1800 + 120 * k, 6200) * np.exp(-t / 0.0011)
    body = np.sin(2 * np.pi * f0 * t) * np.exp(-t / 0.010) * 0.55
    plast = np.sin(2 * np.pi * (1050 + 40 * k) * t) * np.exp(-t / 0.0035) * 0.25
    rel = np.zeros(n); r0 = int((0.042 + 0.004 * k) * SR)
    rel[r0:] = bandnoise(n - r0, 2500, 7000) * np.exp(-np.arange(n - r0) / SR / 0.0008) * 0.22
    x = click * 1.0 + body + plast + rel
    x *= np.minimum(1, (n - np.arange(n)) / (0.01 * SR))
    save(f'key_{k + 1}.wav', x, -7.0)

# varredura: ruído rosado com faixa que sobe devagar + brilho tonal leve, entra e sai macio
n = int(3.0 * SR); t = np.arange(n) / SR
w = rng.standard_normal(n)
pink = onepole_lp(w, 1200) * 0.6 + onepole_lp(w, 300) * 0.4
fc = 500 * (6.0 ** (t / 3.0))
y = np.zeros(n); acc1 = acc2 = 0.0
for i in range(n):
    a = np.exp(-2 * np.pi * fc[i] / SR)
    acc1 = (1 - a) * w[i] + a * acc1
    acc2 = (1 - a) * acc1 + a * acc2
    y[i] = acc1 - acc2
tone = (np.sin(2 * np.pi * 880 * t + 0.6 * np.sin(2 * np.pi * 0.7 * t)) * 0.10 + np.sin(2 * np.pi * 1320 * t) * 0.05) * (0.5 + 0.5 * np.sin(2 * np.pi * 3.2 * t))
env = np.minimum(1, t / 0.45) * np.minimum(1, (3.0 - t) / 0.9) ** 1.5
x = (y * 1.4 + pink * 0.25 + tone) * env
save('scan_sweep.wav', x, -9.0)
print('ok')
