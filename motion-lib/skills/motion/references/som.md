# Som

O dono quer som **calminho**. Já reprovou: barulho robótico, glitch, começo barulhento e vento de arrasto sobreposto. Já amou: um tick suave por letra quando o nome da marca aparece no fim.

## Regras

1. **Whoosh e vento: não usar.** O dono acha som de vento em movimento de câmera "meio AI slop de som" (Espectrosint, out/2026: o whoosh do segundo 11, quando a câmera recua para a varredura). Movimento de câmera fica sem efeito; a cama musical segura a transição. Os arquivos `Deep, Mini, Whoosh` continuam na pasta só como histórico.
2. **Vento sintetizado (`calm/air_*.wav`) banido em arrasto.**
3. **Texto entrando = tick.** `calm/tick_a.wav` e `tick_b.wav` alternados, volume 0,2 a 0,34. Nome da marca no fim: um tick por letra (a cada 0,055 s) e `calm/bloom.wav` a 0,3 logo depois.
4. **Interface = som de interface.** Toque: tick. Envio: `bloop`. Recebido: `recv`. Acerto: `correct` + `sparkle` baixinho. Resultado: ticks em sequência + `pluck`.
5. **Fora:** arquivos Glitch, BadScan, Radio Reverse, Error, Censor. Soam robóticos.
6. **Volume baixo é a regra:** interface 0,15 a 0,3.
7. **Nada de som por item em varredura ou lista rápida.** No Espectrosint, uma nota de marimba a cada ícone que o feixe acendia, mais um "sweep" sintetizado por baixo, foram reprovados ("o som de quando passa o verde nos ícones é ruim"). Deixar a cama segurar o momento.
8. **Sem voz, nada de agudo sustentado no fecho.** O `bloom.wav` virou o som mais alto do fim e foi reprovado ("o som agudo do finalzinho"). Fechar com os ticks das letras e a cama resolvendo no acorde final.
9. **Cama musical:** `engine/synth_bed.py` gera um pad calmo com os acordes trocando nos tempos de `T`; `mixbed.py` põe a cama 9 dB abaixo dos efeitos e normaliza o total. Passou sem queixa no Espectrosint.

## Cues

A página declara `window.CUES = [[segundo, 'pasta/arquivo.wav', volume, corte?], ...]`, calculado a partir de `T`. O renderizador exporta com `CUES_OUT=cues.json`. Caminhos relativos a `LIB/sons/`.

```js
const tk = (x, f, v) => [+x.toFixed(3), `calm/${f}.wav`, v];
window.CUES = [
  ...T.words1.map((x, i) => tk(x, i % 2 ? 'tick_b' : 'tick_a', 0.32)),
  ...[0, 1, 2, 3, 4].map((i) => tk(T.logo + 0.53 + i * 0.055, i % 2 ? 'tick_b' : 'tick_a', i % 2 ? 0.2 : 0.22)),
  tk(T.logo + 0.85, 'bloom', 0.3),
];
```

Ajustar o número de ticks ao número de letras do nome da marca.

## Mixagem

- Sem voz: `python3 LIB/engine/mix.py cues.json LIB/sons DURACAO trilha.wav -20` (peça esparsa a -14 ficou alta demais).
- Com voz: `python3 LIB/engine/mixvo.py cues.json LIB/sons DURACAO trilha.wav -16 vo.json`. Os efeitos abaixam sozinhos quando a voz fala (sidechain). `vo.json` com caminhos absolutos.
- Os dois: `amix normalize=0` → `alimiter` → `loudnorm` em duas passadas. Conferir: `ffmpeg -i video.mp4 -af ebur128 -f null -`.
- Entregar o WAV separado (48 kHz, 24 bits).

## Biblioteca (`LIB/sons/`)

| Arquivo | Duração | Uso |
|---|---|---|
| `calm/tick_a.wav`, `tick_b.wav` | 0,5 s | texto entrando, toque, letras do logo |
| `calm/bloom.wav` | 5,6 s | fecho da assinatura só com voz por cima; sem voz, reprovado (agudo sustentado) |
| `calm/key_1..6.wav` | 0,12 s | tecla macia, uma por letra digitada (0,2 a 0,28); sem queixa |
| `calm/scan_sweep.wav` | 3 s | reprovado no Espectrosint; não usar sob varredura |
| `calm/correct.wav` | 3,9 s | acerto (0,28) |
| `calm/sparkle.wav` | 2,8 s | recompensa (0,15) |
| `calm/bloop.wav` | 1,9 s | envio, painel subindo |
| `calm/recv.wav` | 3,5 s | recebido |
| `calm/pluck_*.wav`, `marimba_*.wav` | 2 a 3,8 s | notas suaves de resultado |
| `calm/pad.wav` | 22 s | cama opcional (ainda não usada) |
| `calm/air_0.7.wav`, `air_0.9.wav` | 2,5 s | banido em arrasto |
| `V5/Deep, Mini, Whoosh 14.wav` | 0,75 s | reprovado: whoosh soa como AI slop para o dono |
| `V4/Deep, Mini, Whoosh (7).wav`, `(8).wav` | 2,5 s | reprovado: vento em movimento de câmera soa como AI slop |
| `V4/Button, Cursor, Select  (5).wav` | 0,35 s | clique de seleção |
| `Editing Pack/Select, Gratonal, Gleam_3.wav` | 0,3 s | brilho curto de aparição |
| `V4/Granular Shine (45).wav` | 3,8 s | brilho de frase de destaque |

`calm/` foi sintetizado com numpy. `V4`, `V5` e `Editing Pack` são do pacote gratuito Botanica que o dono baixou (`LIB/sons/LEIA-ME-botanica.txt`). Medir arquivos novos: `python3 LIB/engine/analyze.py PASTA_COM_SUBPASTAS`.
