# motion-lib

Biblioteca de motion design em código para o Claude, com entrega no DaVinci Resolve gratuito. Uma skill geral (`skills/motion`) e o material que ela usa.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `skills/motion/` | a skill: `SKILL.md` + `references/` (técnicas, estrutura, som, voz, produto na tela, DaVinci) |
| `engine/` | `render.mjs` (Playwright, quadro a quadro, divisível em processos), `mix.py`, `mixvo.py` (voz com sidechain), `mixbed.py` (efeitos + cama musical), `voicing.py` (detecta sussurro), `analyze.py` (mede sons), `synth_ui.py` (teclas e varredura), `synth_bed.py` (cama calma por acordes), `camcheck.mjs` (velocidade da câmera por quadro), `tdump.mjs` (imprime `T`), `template.html` (ponto de partida) |
| `sons/` | `calm/` (sintetizados, calmos) + `V4`, `V5`, `Editing Pack` (pacote gratuito Botanica) |
| `referencias/` | `kou-spotify/` (referência máxima do dono: vídeo, quadros, notas), `lumna/` e `espectro/` (exemplos aplicados com histórico de feedback) |
| `exemplos/` | peças completas que funcionam: `lumna-kou.html`, `lumna-voz.html` (com as frases de voz em `vo/`) e `espectro.html` (demo de dashboard: digitação, varredura, cards) |

## Instalação

A skill fica visível para o Claude Code por um link simbólico:

```bash
ln -s /Users/cass/claudeskills/motion-lib/skills/motion ~/.claude/skills/motion
```

O motor precisa do `playwright-core` (já em `engine/node_modules`) e do Chromium headless do cache do Playwright, além de `ffmpeg` e `python3` com `numpy` e `scipy`.

## Créditos

- Referência visual: conceito Spotify "Purity of Motion", de kouspure. Material de estudo, não de cópia.
- Sons `V4`, `V5`, `Editing Pack`: pacote gratuito Botanica (ver `sons/LEIA-ME-botanica.txt`).
- Sons `calm/`: sintetizados para estas peças.

## Evolução

- Adicionar uma peça nova em `exemplos/` e uma nota em `referencias/` sempre que o dono aprovar um vídeo.
- Registrar em `skills/motion/SKILL.md` ("Gosto do dono") todo feedback que valha para qualquer marca.
- Próximo passo planejado: script do DaVinci que monta projeto, timeline e marcadores (ver `references/davinci.md`).
