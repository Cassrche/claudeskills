# Exemplo aplicado: Espectrosint (out/2026)

SaaS de OSINT (espectrosint.com). Pedido do dono: trocar o vídeo da landing, que tinha sido feito por IA de vídeo (texto torto, UI inventada, 24 qps), por um demo "super trabalhado": digitar um e-mail, clicar, cards de resultado aparecendo, bastante dashboard, cliques, 3D e fluidez. Sem voz.

Peça em `LIB/exemplos/espectro.html` (UI recriada do `dashboard.html` de produção, dados ilustrativos com "illustrative example" na tela).

## Roteiro (29 s; a versão da landing corta em 25 s, sem o logo)

| Segundo | Tela |
|---|---|
| 0,3 a 2,4 | câmera colada no título do app: fantasma cai, "Hello, Hacker." palavra a palavra |
| 2,4 a 4,9 | câmera recua; a janela do dashboard nasce em volta em 3D, peças entram em sequência |
| 4,9 a 9,7 | cursor clica no campo, e-mail digitado letra a letra, liga o Deep search, clica em buscar |
| 9,7 a 13,4 | parede inclinada com as 37 fontes reais do roster de e-mail; feixe verde acende as 14 que acharam |
| 13,4 a 15 | parede achata, as fontes achadas voam para o painel "Sources with results" |
| 15 a 19 | cards sobem em 3D, números contando, profundidade de campo |
| 19,5 a 21,6 | card de vazamento sai da tela com colchetes de evidência |
| 21,6 a 24,5 | página rola e entram mais 5 cards |
| 24,5 a 29 | janela recua e desfoca; logo letra a letra com ticks |

## Histórico de feedback

1. Primeira versão: "mto bom!". Pedidos: som do feixe passando nos ícones ruim (notas por ícone + sweep), agudo do fim ruim (bloom), clique em "Open profile" desnecessário: trocar por rolar e mostrar mais cards. Tudo feito.
2. Segunda versão: "mto bom pqp!".
3. Versão da landing: com som, menos granulado e mais qualidade. Grão de 0,06 para 0,012, render em 4K (`DSF=2`) reduzido para 1080p com lanczos, crf 21 com `aq-mode=3`: 7,4 MB para 25 s.
4. "Esses sons de vento (o whoosh do segundo 11) são meio AI slop de som": whooshes banidos da lib e tirados do vídeo.

## Entrega na landing

PR `Cassrche/espectro#386`: troca de `assets/espectro-demo.mp4` e pôster, botão de som (autoplay é mudo), carregamento quando a seção chega perto da tela, celular no mesmo 16:9 até existir vertical.
