# Entrega no DaVinci Resolve

O dono usa o **DaVinci Resolve gratuito** no Mac. O motion nasce em código; o Resolve serve para cortar, juntar com outras cenas, ajustar som e exportar. Explicar em passos curtos: o dono está começando no Resolve.

## O que entregar

| Arquivo | Para quê | Como gerar |
|---|---|---|
| `nome.mp4` (master) | qualidade máxima, H.264 crf 19, 60 qps | ver o fluxo no SKILL.md |
| `nome-leve.mp4` | ver no chat e mandar para alguém | crf 24 |
| `nome-trilha.wav` | som separado, 48 kHz 24 bits, para mexer no Fairlight | `mix.py` / `mixvo.py` (ver `som.md`) |
| `nome-prores.mov` (opcional) | edição mais leve no Resolve | `ffmpeg -framerate 60 -i f/%05d.png -i trilha.wav -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le -c:a pcm_s24le nome-prores.mov` |
| camada com transparência (opcional) | título, legenda ou logo por cima de outro vídeo | render com fundo transparente + ProRes 4444 (`-profile:v 4 -pix_fmt yuva444p10le`) |

Camada transparente: no modo captura, esconder `.stage` background, brilhos, granulação e vinheta, e tirar o print com `omitBackground: true` no Playwright. VERIFICAR na primeira vez: o PNG precisa sair com alfa e o Resolve precisa ler o canal alfa do .mov.

## Abrir no Resolve (passo a passo para o dono)

1. Projeto novo. Antes de importar: engrenagem (canto inferior direito) → Master Settings → Timeline resolution 1920x1080, **Timeline frame rate 60**, Playback frame rate 60. A taxa da timeline não muda depois que tem mídia.
2. Aba **Media** (ou Cut): arrastar o `.mp4` (ou `.mov`) e o `.wav` para a Media Pool.
3. Aba **Edit**: arrastar o vídeo para a timeline. Se for usar o WAV separado, apagar o áudio embutido do clipe e pôr o WAV na faixa A1, encostado no início.
4. Sequência PNG: o Resolve agrupa `00001.png, 00002.png...` como um clipe só. VERIFICAR a taxa: se entrar a 24 qps, clique direito no clipe → Clip Attributes → 60.
5. Exportar: aba **Deliver** → preset H.264 Master ou YouTube 1080p, 60 qps; para web, limitar a 20 a 40 Mbit/s. Som em AAC 320 kbps. Loudness da peça já sai a -16 LUFS (com voz).

## Automatizar (roteiro de evolução)

- O Resolve tem API em Python e Lua. No gratuito, scripts rodam de dentro do app: salvar o `.py` em `~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Edit/` e o dono roda por Workspace → Scripts. VERIFICAR antes de prometer: acesso externo (script rodando fora do Resolve) é tratado como recurso do Studio.
- Um script útil: criar projeto 1080p60, importar master + WAV, montar a timeline com o WAV em A1 e marcadores nos tempos de `T` (cada cena vira um marcador nomeado).
- Fusion: títulos (Text+) e macros `.setting` são texto; dá para gerar presets com a gramática da referência (entrada por desfoque, palavra a palavra). Ainda não testado.

## Regras

- Nunca entregar só o vídeo com som embutido: o WAV separado é o que deixa o dono ajustar volume no Resolve.
- Dizer onde os arquivos estão e oferecer mover da pasta temporária para uma pasta do dono.
- Termos do Resolve em inglês, como aparecem na tela (Media Pool, Edit, Deliver).
