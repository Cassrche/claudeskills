# Voz (locução)

O dono tem conta no ElevenLabs e o conector está ligado no Claude. A voz segue o pedido de cada peça (gênero, idade, energia, idioma). Se o pedido não disser nada, perguntar em uma linha ou escolher uma voz natural e calma no idioma da peça.

## Roteiro

- Frases tiradas da copy real da marca. Nada de número ou promessa inventada.
- Passar anti-ai-slop-writing + humanizer: sem travessão, sem tríade forçada, sem "não é só X, é Y" gratuito (contraste só quando corrige uma crença real do público).
- Uma frase por cena, 7 a 12 palavras. Peça de 25 a 30 s comporta umas 60 palavras.
- Duração aproximada antes de gerar: `say -v Luciana -r 150 -o guia.aiff "frase"` (pt-BR). **Nunca entregar a voz do `say`**: é robótica.

## Gerar no ElevenLabs (conector)

1. `creative_list_voices` com `languages` do idioma, `gender`, `use_cases` (`narrative_story`, `advertisement`, `informative_educational`) e `descriptives` do clima (ex.: `calm`, `gentle`, `pleasant`, `confident`). O filtro de uso funcionou melhor que o de sotaque.
2. Evitar vozes de "sono/meditação" para produto: lentas demais.
3. `creative_generate_speech`, `model_id:"eleven_v4"`, `generations_count:2`, primeiro com `estimate_only:true`. Referência de custo: cerca de 1 crédito por caractere por versão (330 caracteres = 337 créditos).
4. **Sem tag `[softly]` ou `[whispers]`** quando a voz já é suave: a tag fez a primeira frase sair sussurrada e o dono reprovou. Tags só quando o roteiro pede emoção diferente; `[pause]` antes do nome da marca funciona.
5. O arquivo não vem na resposta: chamar `creative_get_flow_run_status` (`flow_id` + `session_ids`) e baixar cada `content_url` com `curl` (link vale 2 h).
6. Gerar o roteiro inteiro numa chamada (tom contínuo). Frase ruim: regravar só ela com a mesma voz e o mesmo modelo, e igualar o nível.

Sem conector: Higgsfield `generate_audio`, `model:"text2speech_v2"`, `variant:"elevenlabs"` (cerca de 1 crédito Higgsfield), mas as vozes são presets em inglês, com risco de sotaque. Confirmar o gasto com o dono antes (regra global).

## Checar e cortar

- Sussurro: `python3 LIB/engine/voicing.py take.mp3 0 2.6 3.1 5.8`. `voiced` abaixo de 0,6 soa sussurrado (a frase reprovada deu 0,51; as boas ficaram entre 0,70 e 0,82).
- Respiros: `ffmpeg -i take.mp3 -af silencedetect=noise=-38dB:d=0.18 -f null -`. Cortar cada frase com 0,06 s de folga antes e 0,12 s depois, `afade` 0,02 s na entrada e 0,06 s na saída, 48 kHz estéreo.
- Nível entre frases: coluna `nivel` do `voicing.py`; diferença acima de 2 dB pede ganho.

## Sincronizar

- Cada frase vira uma entrada em `window.VO = [[segundo, 'vo/l1.wav', 1], ...]`.
- `T` se ajusta à fala: palavra na tela no segundo em que é dita, toque na tela na palavra da ação, movimento grande no respiro entre frases.
- Nome da marca falado entra depois dos ticks do logo.
- Mixar com `mixvo.py` a -16 LUFS (ver `som.md`).
- Trocar só o áudio de um vídeo pronto: `ffmpeg -i video.mp4 -i trilha.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest saida.mp4`.

Vozes já usadas e aprovadas ficam anotadas nas notas de cada exemplo (`LIB/referencias/`).
