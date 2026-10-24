---
name: motion
description: "Motion design geral feito em código: vídeo animado de produto, SaaS, app, lançamento, explainer, vinheta ou animação de logo, para qualquer marca. A página HTML desenha cada quadro a partir do tempo, o Playwright fotografa a 60 qps, o ffmpeg monta vídeo e som, e a entrega vai pronta para o DaVinci Resolve. Inclui desenho de som, locução (ElevenLabs), produto na tela e entrega no DaVinci. Gatilhos: 'faz um motion', 'mograph', 'motion design', 'vídeo animado', 'vídeo do produto', 'vinheta', 'animação de logo', 'vídeo SaaS', 'DaVinci'."
---

# motion

`LIB = /Users/cass/claudeskills/motion-lib` (motor em `LIB/engine`, sons em `LIB/sons`, referências em `LIB/referencias`, peças completas em `LIB/exemplos`).

Motion design em código, para qualquer marca. Cada quadro sai de uma função `render(t)`; nada depende do relógio. Isso deixa o vídeo exato, retimável e reproduzível.

Antes de começar, carregar também as skills globais do dono: hallmark + antislop (visual) e anti-ai-slop-writing + humanizer (texto na tela e roteiro).

## Quando abrir cada referência

| Situação | Ler |
|---|---|
| Sempre, antes de animar | `references/tecnicas.md` (curvas, foco de câmera, palavra a palavra, fundo vivo, render) |
| Montar a sequência de cenas e o tempo | `references/estrutura.md` |
| Toda peça com áudio | `references/som.md` |
| Pedido de voz, narração, locução | `references/voz.md` |
| Mostrar o produto (app, site, painel, dispositivo) | `references/produto-em-tela.md` |
| Entregar, ou dúvida sobre o Resolve | `references/davinci.md` |
| Calibrar o padrão de qualidade | `LIB/referencias/kou-spotify/` (referência máxima do dono) |

## Fluxo

1. **Ler a marca de verdade.** Site, cores, fonte, ícone e copy reais. Nada de métrica, depoimento ou número inventado.
2. **Escrever o roteiro (ou a sequência de frases) antes do visual.** Com voz, o roteiro manda no tempo.
3. **Linha do tempo `T`:** um objeto com o segundo de cada evento; animação e som derivam dele. Retimar = mudar só `T`.
4. **Construir a página** a partir de `LIB/engine/template.html`. As peças em `LIB/exemplos/` mostram cenas mais ricas para copiar trechos.
5. **Conferir quadros soltos** antes do render completo (folha de contato) e olhar a imagem de fato.
6. **Render completo a 60 qps** em 4 processos paralelos, mix, encode.
7. **Entregar** versão leve (para ver) e master + WAV separado (para o DaVinci). Se os arquivos estiverem em pasta temporária, oferecer mover.

## Gosto do dono

Valem para qualquer marca, até o dono dizer o contrário.

- **Referência máxima:** conceito Spotify "Purity of Motion", de kouspure (`LIB/referencias/kou-spotify/`). Fundo escuro com brilhos que respiram, granulação, tudo entra por desfoque até ficar nítido, texto palavra a palavra, blocos em 3D, listas inclinadas com profundidade de campo, rastreio de letras, logo letra a letra. Copiar a gramática, nunca a arte ou a marca.
- **"O mais gostoso possível, fluido":** molas e saídas suaves; nada entra seco; a câmera nunca para totalmente.
- **60 qps puro, sem motion blur** (motion blur deixou fantasma e foi reprovado).
- **Abertura calma.** Nada de começo escuro e caótico.
- **Som calminho:** nada robótico, glitch ou barulheira; **nada de whoosh ou vento em movimento de câmera** (o dono acha AI slop de som); um tick por letra quando o nome da marca aparece no fim (o trecho favorito do dono).
- **Mostrar o produto funcionando** quando existir produto, com a UI real da marca.
- **Voz natural:** sussurro e voz robótica foram reprovados.
- **Sem som por item:** blip a cada ícone numa varredura ficou ruim; agudo sustentado no fecho (bloom sem voz) também.
- **Demo termina mostrando mais produto, não clicando em botão:** o clique em "Open profile" no fim foi trocado por rolar e revelar mais cards.

## Regras técnicas

- Determinístico: sem `Math.random()` solto, sem CSS `animation`/`transition`; ruído com semente fixa.
- Medir texto dentro de `render(t)` (as fontes chegam depois do carregamento).
- Esconder grupos com `display: none`, nunca `visibility: hidden` (filho `visible` vaza).
- `filter: blur()` achata o 3D do elemento; pôr `perspective` no elemento que leva o blur e `preserve-3d` no filho.
- Cores e fontes por token (`var(--...)`).
- Texto na tela sem itálico em título, sem travessão, sem emoji.

## Checklist de entrega

- [ ] Folha de contato dos quadros-chave conferida: nada vaza, corta ou sobrepõe
- [ ] `ffprobe`: 60 qps e duração certa; render sem erro no console
- [ ] Sem whoosh/vento; ticks do nome da marca no fim
- [ ] Loudness medido: -16 LUFS com voz, -20 sem voz
- [ ] Copy e números reais, ou estado de demonstração declarado no comentário do arquivo
- [ ] Master, leve e WAV separado entregues

## Comandos

```bash
cd /Users/cass/claudeskills/motion-lib/engine && npm install      # uma vez
STILLS=1,4,8 node render.mjs /caminho/pagina.html /tmp/st stills
FPS=60 FROM=0 TO=420 CUES_OUT=cues.json VO_OUT=vo.json node render.mjs /caminho/pagina.html /tmp/f full   # repetir com outros FROM/TO em paralelo
python3 mix.py cues.json ../sons DURACAO trilha.wav -20                        # sem voz
python3 mixvo.py cues.json ../sons DURACAO trilha.wav -16 vo_absoluto.json     # com voz
node tdump.mjs /caminho/pagina.html                                            # T e DURATION em JSON
node camcheck.mjs /caminho/pagina.html                                         # picos e paradas da câmera (px/quadro)
W=1080 H=1920 PERSP=2400 node camcheck.mjs /caminho/vertical.html             # vertical: W/H valem também para render.mjs e tdump.mjs
python3 synth_bed.py acordes.json DURACAO cama.wav                             # cama calma (acordes nos tempos de T)
python3 mixbed.py efeitos.wav cama.wav trilha.wav -20 9                        # cama 9 dB abaixo, total normalizado
ffmpeg -framerate 60 -i /tmp/f/%05d.png -i trilha.wav -c:v libx264 -pix_fmt yuv420p -crf 19 -preset slow -c:a aac -b:a 256k -shortest -movflags +faststart master.mp4
```

`render.mjs` usa o Chromium do cache do Playwright (`~/Library/Caches/ms-playwright/chromium_headless_shell-*`); se a versão mudar, ajustar o caminho no topo.
