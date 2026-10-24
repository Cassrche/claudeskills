# Técnicas (código pronto)

Todas vêm de peças aprovadas. Exemplos completos em `LIB/exemplos/` (`lumna-kou.html`: só tipografia e UI; `lumna-voz.html`: com produto em dispositivo e voz). Ponto de partida limpo: `LIB/engine/template.html`.

## Esqueleto da página

- Palco fixo `1920x1080` (`.stage`), escalado para caber na janela só fora do modo captura.
- `?capture=1` desliga a escala e o loop; o renderizador chama `window.renderAt(t)` e lê `window.DURATION`, `window.CUES` e `window.VO`.
- Camadas, de trás para frente: `#glowA` e `#glowB` (brilhos), `#world` (todo o conteúdo), `#grain`, `#vignette`, `#fade`.

## Curvas e mola

```js
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, s, d) => clamp((t - s) / d);          // 0 → 1 entre s e s+d
const lerp = (a, b, x) => a + (b - a) * x;
const eOut4 = (x) => 1 - Math.pow(1 - x, 4);           // entrada padrão
const eIn3 = (x) => x * x * x;                          // saída padrão
const eInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
function spring(dt, f = 1.6, z = 0.8) {                  // mola amortecida, 0 → 1 (passa um pouco se z < 0.8)
  if (dt <= 0) return 0;
  const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * dt) * (Math.cos(wd * dt) + (z * w / wd) * Math.sin(wd * dt));
}
```

Mola com `z` 0.5 dá o "pop" de chip (+2 XP); `z` 0.85 a 0.92 dá entrada de aparelho e folha subindo.

## Foco de câmera (o motivo visual da referência)

Entra desfocado e deslocado, fica nítido; sai acelerando, desfocando e à deriva.

```js
// o = { in, inD, out, outD, dx, dy, s0, b0, odx, ody, os, ob, dof, op, base }
function focus(el, t, o) {
  const p = eOut4(prog(t, o.in, o.inD ?? 0.8));
  const q = o.out == null ? 0 : eIn3(prog(t, o.out, o.outD ?? 0.5));
  const x = (1 - p) * (o.dx ?? 0) + q * (o.odx ?? 0);
  const y = (1 - p) * (o.dy ?? 30) + q * (o.ody ?? -20);
  const s = lerp(o.s0 ?? 1, 1, p) * lerp(1, o.os ?? 1.04, q);
  const b = (1 - p) * (o.b0 ?? 22) + q * (o.ob ?? 18) + (o.dof ?? 0);
  el.style.transform = `${o.base ?? ''} translate(${x}px, ${y}px) scale(${s})`;
  el.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : 'none';
  el.style.opacity = Math.min(p, 1 - q) * (o.op ?? 1);
  return p;
}
```

Valores que funcionaram: entrada 0.6 a 0.9 s com blur 14 a 22 px; saída 0.35 a 0.5 s.

## Palavra a palavra com cor que esfria

Cada palavra num `<span class="w">` (`display:inline-block; white-space:pre`). A palavra de destaque leva `data-tint`: nasce na cor de acento e esfria para branco.

```js
function words(container, t, start, stagger, o) {     // start = segundo inicial, ou lista de segundos (sincronia com voz)
  $$('.w', container).forEach((w, i) => {
    const s = Array.isArray(start) ? start[i] : start + i * stagger;
    focus(w, t, { ...o, in: s });
    if (w.hasAttribute('data-tint')) w.style.color = mixRGB(VOLT, WHITE, prog(t, s + 0.35, 0.9));
  });
}
```

Intervalo entre palavras: 0.07 a 0.14 s. Com voz, passar a lista de segundos em que cada palavra é dita.

## Fundo vivo

- Dois brilhos (`border-radius:50%; filter: blur(140px)`), cor primária a 0.34 e secundária a 0.14, andando em seno/cosseno lento (0.28 a 0.4 rad/s).
- Granulação: 4 canvas 256x256 de ruído com semente fixa, trocados a 24 qps, opacidade 0.07, posição pulando a cada quadro.
- Vinheta radial até 0.72 de preto nas bordas.
- `#world` com escala de 1 → 1.035 e rotação de -0.25° → +0.25° ao longo da peça: a câmera nunca para.

## Gramática de cenas da referência

- **Ícone + frase:** ícone cai com mola (`spring(t-0.12, 1.3, 0.85)`) de 300 px acima, desliza para a esquerda abrindo espaço, a frase entra palavra a palavra ao lado. Centralizar o conjunto medindo `offsetWidth` dentro do `render`.
- **Anel vira três círculos:** anel com brilho entra, encolhe e some; três discos entram dos lados; o do centro nítido, os laterais desfocados (DOF) até ficarem nítidos.
- **Bloco 3D:** container com `perspective: 1500px`; bloco com `rotateY` de ±26 → ±5 e `rotateX` 8 → 3 durante 1.6 s, título palavra a palavra, parágrafo e um chip de ação.
- **Lista inclinada com profundidade de campo:** linhas com `rotateX(16→10) rotateY(-16→-7)`, sobem devagar; blur por distância da linha central: `max(0, |centroY - 520| - 150) / 34`.
- **Chips:** fileira de pílulas; uma vira ativa com cor da marca e um "aperto" de escala 0.94.
- **Frase de contraste:** primeira linha nasce cinza e vira branca; a segunda entra com rastreio de letras `0.42em → -0.02em` em 0.9 s.
- **Assinatura:** ícone pula com mola, desliza, o nome entra letra a letra a cada 0.055 s (com um tick por letra, ver `som.md`), crédito pequeno em cinza embaixo, fade para preto.

## Render

- `render.mjs` aceita `FROM`/`TO` (índices de quadro). Quatro processos em paralelo cortam o tempo pela metade ou mais.
- `CUES_OUT` e `VO_OUT` exportam as listas de som da página para o mixer.
- Folha de contato: `ffmpeg -i a.png -i b.png ... -filter_complex "concat=n=N:v=1:a=0,scale=960:540,tile=2xK" -frames:v 1 folha.png`.
- Cena com celular 3D e blur pesa: cerca de 3 qps por processo.
