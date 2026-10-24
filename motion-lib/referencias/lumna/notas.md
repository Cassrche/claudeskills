# Exemplo aplicado: Lumna (out/2026)

Plataforma de estudo de medicina no método PBL (lumna.org), projeto do Hospital Moinhos de Vento com a FIAP. Peças em `LIB/exemplos/`:

- `lumna-kou.html`: 13 s, sem voz, só tipografia e UI solta, na gramática da referência Kou. O dono: "mto bom! de vdd!".
- `lumna-voz.html`: 28 s, com voz e app dentro de um celular. O dono: "MTO BOM!" e "ficou mto bom o design". Vídeo final em `lumna-voz.mp4`; quadros em `quadros-lumna-voz.png`.

## Histórico de feedback (o que mudou cada versão)

1. Primeira versão com muito barulho robótico e começo barulhento: refeita com sons calmos sintetizados, sem abertura caótica, 60 qps puro.
2. "Ainda não tá profissional como eu vejo os caras fazendo": refeita na gramática da referência Kou. Aprovada.
3. "O som do vento quando algo arrasta se sobrepõe": tirado o vento sintetizado, um whoosh por movimento grande, sem sobreposição.
4. "Os barulhos do Lumna do final é muito bom (aparece cada letra)": ticks letra a letra viraram padrão da lib.
5. Pedido de celular com o app e voz suave: aprovado.
6. "Esse sussurro do começo não ficou legal": a tag `[softly]` do ElevenLabs sussurrou a primeira frase; regravada sem tag.
7. Versão final com a frase regravada: "Perfeito, considere muito bom, parabéns." Esta peça é o padrão de qualidade da lib.

## Tempos da peça com voz

| Segundo | Fala | Tela |
|---|---|---|
| 0,5 | "Estude medicina como quem está de plantão." | ícone + "Medicina de plantão." |
| 3,5 | "Na Lumna, você segue um caminho por dia." | três círculos + "Um caminho por dia" |
| 6,8 | "No quiz, você responde e já lê por que acertou ou errou." | celular sobe pela direita: plantão → quiz → acerto → explicação |
| 11,2 | "No paciente simulado, quem pergunta é você, por texto ou por voz." | celular cruza para a esquerda; bloco 3D à direita; conversa e gravação por voz |
| 16,8 | "Quando a consulta acaba, a Supervisora comenta a sua conduta." | toque em Encerrar → parecer com barras |
| 20,7 | "Mais que um banco de questões. É um plantão." | frase de contraste |
| 24 a 28 | "Lumna." (depois dos ticks) | assinatura |

## Voz usada

ElevenLabs, `eleven_v4`, voz "Letícia - Gentle, Pleasant & Warm" (`CcElPA8NBrawbunFs7rh`), brasileira, calma. Duas versões do roteiro inteiro (674 créditos) + primeira frase regravada (84 créditos). Frases cortadas em `LIB/exemplos/vo/`.

## Marca

Cores tiradas do site: `#2459f5` (azul), gradiente do ícone `#087fe2 → #0755b5 → #39d6c6`, acento `#ffc93d`. Fontes: Archivo (títulos) e Nunito (texto). App claro dentro de cena escura.
