# Estrutura de cenas e tempo

## A referência máxima (Spotify "Purity of Motion", kouspure, 9,2 s)

Quadros em `LIB/referencias/kou-spotify/quadros-1.png` e `quadros-2.png`; vídeo em `kou-spotify.mp4`. Ordem observada:

1. Logo pequeno cai no centro, desliza para a esquerda; o slogan entra palavra a palavra, última palavra na cor da marca esfriando para branco.
2. Anel na cor da marca surge e vira três discos; centro nítido, laterais desfocados; título no canto, palavra a palavra.
3. Bloco (título, parágrafo, pílula de ação) inclinado em 3D, entra desfocado e se endireita.
4. Lista do produto inclinada, com desfoque nas linhas longe do centro, subindo devagar.
5. Fileira de pílulas; uma vira ativa.
6. Frase de contraste em duas partes: cinza que vira branco, depois rastreio de letras fechando.
7. Logo + nome letra a letra; crédito minúsculo embaixo; escurece.

Som esparso na referência: whoosh grave por movimento grande e ticks nos textos. Para o dono, o whoosh não vale (soa como AI slop); ficam os ticks e a cama.

Usar a gramática; nunca a arte, a marca ou os textos dela.

## Molde de 6 tempos (sem voz, 12 a 15 s)

| Tempo | Duração | Conteúdo |
|---|---|---|
| 1 | 2,3 s | ícone + frase-tese palavra a palavra |
| 2 | 2 s | anel vira três círculos (os pilares do produto) + título |
| 3 | 2 s | bloco 3D com a promessa principal + chip de ação |
| 4 | 2,5 s | produto na tela (lista inclinada, UI solta ou dispositivo) + chips |
| 5 | 1,6 s | frase de contraste com rastreio de letras |
| 6 | 3 s | assinatura letra a letra + crédito, fade |

As cenas se sobrepõem 0,1 a 0,3 s: a seguinte começa enquanto a anterior sai. Trocar a ordem ou cortar tempos conforme a história da marca; o molde é ponto de partida, não fôrma.

## Com voz (25 a 30 s)

Uma frase por cena. A tela ilustra a frase no momento em que ela é dita. Produto na tela ganha as cenas mais longas (4 a 5 s cada), porque é onde a pessoa entende o que a coisa faz.

## Linha do tempo dirigida por `T`

```js
const T = {
  words1: [0.98, 2.0, 2.15],     // segundo em que cada palavra é dita (ou start + intervalo, sem voz)
  s2: 3.45, title2: 4.85,
  ph: 6.2, glide: 10.6,          // eventos de produto na tela
  l5a: 20.7, l5b: 22.75, logo: 24.0,
};
const DURATION = +(T.logo + 3.95).toFixed(2);
```

Regras que deram certo:

- Toque ou ação na tela cai na palavra que descreve a ação.
- Entre frases, 0,4 a 0,9 s de respiro; movimento grande de câmera mora nesse respiro.
- Nome da marca falado entra depois dos ticks do logo, nunca por cima.
- `CUES` e `VO` também derivam de `T`: mudar `T` arrasta som e voz juntos.

## Exemplos aplicados

`LIB/referencias/lumna/notas.md` descreve a peça Lumna (13 s sem voz e 28 s com voz e dispositivo), com a tabela de tempos e o que o dono aprovou e reprovou.
