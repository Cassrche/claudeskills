# Produto na tela

Quando a marca tem produto (app, site, painel, ferramenta), mostrar a interface funcionando vale mais que qualquer frase. Três formatos, do mais simples ao mais rico:

1. **UI solta no espaço:** fragmentos da interface (linhas de lista, cartões, chips) flutuando em 3D, como na referência Kou/Spotify. Não precisa de aparelho. É o padrão.
2. **UI dentro de um dispositivo** (celular, notebook, monitor, relógio): quando o produto é claramente de um aparelho, ou quando o dono pede. Desenhar o aparelho em CSS.
3. **Gravação real da tela** (vídeo ou prints do produto): quando o dono fornecer. Entra numa moldura simples ou solta, com os mesmos movimentos de câmera.

Conflito conhecido: o hallmark (gate 47) proíbe moldura de aparelho desenhada. Quando o dono pede o aparelho, o pedido vence; citar o conflito na resposta e no comentário do arquivo.

## Conteúdo da interface

- Textos, perguntas, exemplos e nomes tirados do produto ou do site da marca. Nada de "John Doe" ou métrica inventada.
- Barras, notas e contadores que não forem reais são estado de demonstração: declarar no comentário do arquivo.
- Tema da UI segue a marca (se o produto é claro, a tela é clara, mesmo em cena escura: o contraste vira foco).
- Vermelho de erro: sólido com texto branco (regra do dono no antislop).

## Dispositivo em CSS (receita)

- Invólucro com tamanho do aparelho e `perspective` (recebe posição, escala, blur e opacidade). Esconder com `display: none` fora da cena.
- Filho com `transform-style: preserve-3d` recebe `rotateX/Y/Z`.
- Espessura: 8 a 10 camadas iguais atrás da frente (`translateZ(-1,1 px · i)`) na cor escura do metal; aparecem sozinhas quando o aparelho gira.
- Frente: gradiente metálico em 135°, contorno claro fino, bezel preto, tela com raio, detalhes do aparelho (ilha, câmera, botões), barra de status.
- Reflexo: gradiente branco fraco que desliza conforme `rotateY`.
- Brilho desfocado da cor da marca atrás do aparelho, seguindo a posição.
- Tamanho: o texto da UI precisa ser legível no quadro 1080p (um celular com cerca de 850 px de altura funcionou).

Exemplo completo: `LIB/exemplos/lumna-voz.html` (procurar `celular`).

## Movimento

- Entrada com mola de baixo ou de lado, girando de um ângulo forte (30° a 36°) para um ângulo leve (7° a 16°), com blur saindo.
- Deriva lenta de rotação durante a cena: nunca congela.
- Trocar de lado da tela no respiro entre frases: 1 a 1,2 s em `eInOut`, sempre virado para o centro, texto entra do lado que ficou livre.
- Saída junto com o texto vizinho: sobe, desfoca, some em 0,5 s.

## Painel ou dashboard (janela em 3D, sem moldura)

Receita do Espectrosint (`LIB/exemplos/espectro.html`), para produto que vive no navegador:

- A UI é recriada com as classes e medidas do CSS de produção, dentro de uma janela 1472x828 com cantos arredondados e a grade de fundo do próprio app. Sem barra de navegador desenhada.
- **Câmera por ponto de foco:** `translate(centro) rotateX rotateY rotateZ scale translate(-foco)`. As chaves dizem onde olhar (coordenada da janela), o zoom e o ângulo; Hermite monotônico passa por elas sem parar, mais uma deriva lenta. Conferir com `engine/camcheck.mjs` (picos até uns 20 px por quadro ficaram fluidos).
- **Rolagem de página** separada da câmera (`translateY` do conteúdo), também por chaves.
- **Abertura:** câmera colada no título do app (escala 2,5 a 2,75), fundo da janela escondido; o título entra palavra a palavra e a câmera recua enquanto a janela nasce em volta.
- **Digitação:** clique no campo, cursor some enquanto digita (como no macOS), letra a letra com ritmo de semente fixa, caret medido pelo `offsetLeft` da última letra, uma tecla sintetizada por letra.
- **Varredura:** parede inclinada de pílulas das fontes reais, fileiras andando em sentidos opostos, profundidade de campo por fileira, feixe na cor da marca; o tempo em que o feixe cruza cada pílula é calculado e acende só as que acharam resultado. A parede achata e as pílulas achadas voam para o painel de resultados (começam acesas e apagam ao pousar, para a troca não piscar).
- **Cards:** sobem com `perspective() rotateX` e desfoque, linhas em sequência, números contando; alvenaria de duas colunas medida em `offsetHeight`.
- **Destaque:** o card importante sai da tela numa camada da câmera sem recorte (cópia exata no mesmo lugar), com colchetes de evidência fechando e o resto escurecido.
- **Fim:** rolar e revelar mais cards; depois a janela recua, desfoca e o logo entra letra a letra.

## Versão vertical (celular, 9:16)

Receita do Espectrosint (`LIB/exemplos/espectro-mobile.html`), feita a partir da versão 16:9:

- Palco 1080x1920 e o **layout mobile real** do produto (as regras `@media` do CSS de produção), não a tela de desktop recortada. Viewport de 430x764 px, escala de câmera perto de 2,1. Sem moldura de aparelho.
- **Toque no lugar do cursor** (receita em Interações). Sem teclado desenhado: o texto aparece digitado no campo.
- **Mesma linha do tempo `T`** do 16:9: a cama de som (acordes nos tempos de `T`) serve às duas versões; os efeitos saem da página nova.
- Parede da varredura alta (12 fileiras): o feixe desce e o foco acompanha o feixe. As fontes achadas ficam nas colunas do meio, do lado para onde a fileira não anda.
- Cards numa coluna só: cada um entra quando a rolagem o traz para a tela. O card do destaque sobe de posição para caber no tempo.
- A janela não enche a altura do quadro: centralizar o foco nela, nunca seguir o conteúdo até a janela subir e deixar o pé vazio.
- Rolagem longa no fim pede mais tempo: com o mesmo `T`, estender a última chave da rolagem até a janela sumir manteve o pico em 20 px por quadro.

## Interações

- Toque: círculo translúcido que aparece 0,16 s antes, afunda enquanto pressiona e abre sumindo. Posição medida no elemento tocado.
- Elemento tocado afunda 3 a 6 % e muda de cor.
- Trocar de tela: empurrar (nova entra de 100 % para 0, velha vai para -28 %) ou fundir com blur durante movimento de câmera.
- Itens novos (mensagens, cartões, notificações): mola com leve passada, nascendo do canto de onde vêm.
- Estados vivos: digitando (pontos quicando), gravando (onda de barras), carregando (barra que enche), sempre com início e fim, nunca em loop eterno.
- Cada ação cai na palavra que a voz diz e tem seu som de interface (ver `som.md`).
