# Design — Cantina da Mídia (v1)

Referência visual para implementar as telas. A fonte da verdade do visual são os arquivos em
`design/telas/`. Eles são protótipos (HTML + uma classe JS com a lógica de exemplo). Leia o
markup e os estilos inline para copiar o visual, mas implemente com os componentes do projeto
(Next.js + Tailwind). Os dados dentro deles são de exemplo e não devem ser copiados para o app.

Algumas decisões vieram depois dos protótipos (pagamento em Vendas, criação de dia de venda).
**Onde este documento e um protótipo discordarem, vale este documento.**

| Tela | Computador | Celular |
|---|---|---|
| Painel | `telas/Painel.dc.html` | `telas/Mobile-Painel.dc.html` |
| Vendas | `telas/Vendas.dc.html` | `telas/Mobile-Vendas.dc.html` |
| Pendentes | `telas/Pendentes.dc.html` | `telas/Mobile-Pendentes.dc.html` |
| Cardápio | `telas/Cardapio.dc.html` | `telas/Mobile-Cardapio.dc.html` |

## Tokens

Tema claro apenas. Uma cor primária (preto) para ações; verde para dinheiro recebido e dados.

Os nomes seguem o vocabulário do shadcn/ui (`src/app/globals.css`), para que os componentes de
`src/componentes/ui` usem estas cores sem ajuste.

| Token | Valor | Uso |
|---|---|---|
| `page` | `#F2F2F3` | fundo atrás da moldura do app |
| `background` / `card` / `popover` | `#FFFFFF` | moldura, cards, popovers |
| `muted` | `#FAFAFA` | cabeçalhos de seção, campos, abas |
| `accent` / `secondary` | `#F4F4F5` | hover, contadores |
| `border` | `#ECECEE` | bordas e divisórias |
| `input` | `#E2E2E5` | bordas de botões e campos |
| `foreground` | `#111113` | texto principal |
| `text-2` | `#3F3F46` | texto secundário |
| `muted-foreground` | `#6B6B74` | rótulos, legendas |
| `primary` | `#111113` | botão principal, item ativo do menu, segmento selecionado |
| `primary-foreground` | `#FFFFFF` | texto sobre primary |
| `ok` | `#00716A` | verde só em selos de status ("Pago", "hoje"); também `ring` (foco). Textos ficam em `foreground` |
| `ok-fill` | `#359E95` | verde (preenchimento): barras, switches |
| `ok-soft` | `#E6F4F2` | fundo de selo "Pago" |
| `warn` | `#B4400E` | laranja: pendente, pendente antigo; também `destructive` |
| `warn-soft` | `#FFF1E8` | fundo de selo "Pendente" |

Sombra de elementos flutuantes: `0 1px 2px rgba(17,17,19,.06), 0 8px 24px rgba(17,17,19,.06)`.

**Tipografia:** Poppins em tudo (pesos 400, 500, 600 e 700), servida pelo próprio app (`@fontsource/poppins`),
para funcionar offline.
Base 13px / 1.5, números com `tabular-nums`. Títulos de página 26px peso 600 (celular 18px).
Valores de destaque 22–24px peso 600. Rótulos 11px na cor `muted`.

**Raios:** moldura 14px, cards 12px, botões e campos 8px (celular 9–10px), chips 99px.

## Movimento

Curto e com significado; tudo some com `prefers-reduced-motion`. Tempos em `globals.css`.

- **Trocar de tela pelo menu:** o conteúdo velho some em 140ms e o novo sobe 8px e aparece em 220ms
  (`TransicaoDeTela`, View Transitions do React). A moldura (menu, cabeçalho, barra de abas) fica parada.
- **Trocar de dia ou período na mesma tela:** cruzamento suave do que muda (`TrocaSuave` + `startTransition`);
  o filtro de dia mostra o dia novo na hora, e toques seguidos nas setas andam um dia cada.
- **Barras** crescem (500ms); **cores** de hover e de abas mudam em 200ms.
- **Linhas novas** e a escolha **Pix · Dinheiro · ×** entram com um fade curto (200–300ms).

## Componentes

- **Moldura (desktop):** fundo `page` com padding 16px; dentro, um painel branco com borda e raio 14px.
- **Menu lateral (232px):** marca (quadrado preto com ícone de espeto + "Cantina / Mídia · Casa do Pai"),
  rótulo "Principal", links Painel, Vendas, Pendentes (com contador), Cardápio. Item ativo: fundo preto,
  texto branco. Sem busca e sem Configurações. **Sem cartão de usuário (v1 sem login):** o rodapé do
  menu mostra só "Equipe de mídia · Casa do Pai", sem nome e sem iniciais.
- **Topo da página:** "migalha" com o nome da página à esquerda; à direita, a ação principal.
  Sem sino de avisos (desktop e celular).
- **Filtro de dia:** `‹ [📅 Dom, 15 nov · hoje · nome ▾] ›`, igual nas quatro telas. O botão do
  meio mostra o dia escolhido e abre a lista de dias; as setas andam um dia. Celular: altura 44px,
  ocupa a largura toda. Tablet e desktop: altura 34px, botão do meio com 288px.
  Regras em "Dias de venda", abaixo.
- **Abas:** grupo segmentado com fundo `muted`; aba ativa com fundo branco e sombra (filtro e visão
  dos Pedidos do dia).
- **Faixa de números:** um único card dividido em 4 colunas por linhas verticais (2×2 em telas menores).
- **Selos de status:** Pago (verde), Pendente (laranja), Reservado (neutro com borda).
- **Tabela:** cabeçalho com fundo `sub`, linhas com divisória; paginação de 6 em 6
  ("Mostrando 1–6 de 12", Anterior / números / Próxima).
- **Celular:** cabeçalho branco, conteúdo com rolagem, barra de abas fixa embaixo (4 itens; ativo com
  ícone em fundo preto). Lista em cartões; "Carregar mais" no lugar da paginação. Nova venda é um botão
  flutuante que abre uma folha de baixo para cima com o formulário.
- **Responsivo do desktop:** ≤1180px a faixa de números vira 2×2 e as colunas empilham; ≤860px o menu
  lateral vira barra no topo; ≤560px os links do menu viram 4 colunas só com texto.

## Telas

**Painel**
1. Widget de boas-vindas (sem imagem e sem botões): "BEM-VINDO DE VOLTA" em preto, título
   "Painel da Cantina" e, à direita, o próximo dia de venda com a quantidade de reservas.
2. Filtro de dia com "Todos os dias" (padrão).
3. Faixa de números: Recebido (barra de % recebido), Pendente, Itens vendidos, Reservas.
4. "Vendido por dia": uma linha por dia com barra horizontal (verde sólido = recebido, verde listrado =
   pendente). Clicar na linha filtra por aquele dia.
5. "Precisa de atenção": reservas para entregar e os 3 pendentes mais antigos, com link para Pendentes.

**Vendas**
1. Título, dia por extenso, link para o Cardápio e o filtro de dia (ver "Dias de venda").
2. Formulário de uma linha: Venda/Reserva, Quem, Item (do cardápio do dia), Qtd, Preço un.
   (vem do cardápio e pode ser alterado só nesta venda), **Pagamento: Pendente | Pix | Dinheiro**
   (segmentado, padrão Pendente; substitui o Pago/Pendente do protótipo), botão
   "Registrar · R$ X" ou "Reservar · R$ X". Pix ou Dinheiro registra o pagamento junto com a venda.
   - Item com quantidade no dia mostra o que resta: "Espeto de carne · R$ 12 · restam 5". Item
     esgotado fica na lista, desativado, com "esgotado". O "+" de Qtd para no que resta.
   - Se outro pedido esgotar o item antes de registrar, o erro aparece em `warn` abaixo do
     formulário: "Só restam 3 de Espeto de carne." ou "Espeto de carne esgotou."
3. Faixa de números do dia: Itens vendidos, Recebido, Pendente, Reservas.
4. "Pedidos do dia": busca de cliente, filtro Todos/Reservas/Pendentes/Pagos e visão Lista/Quadro.
   Quadro com 3 colunas: Reservas → Pendentes → Pagos.
5. Mudar o pagamento depois, na lista ou no quadro, segue o padrão de Pendentes:
   - selo "Pendente" ou botão "Marcar pago": abre a escolha **Pix · Dinheiro · ×** no lugar;
   - selo "Pago" mostra a forma ("Pago · Pix") e, ao tocar, oferece "Desfazer" (estorna o
     pagamento); no quadro, "Desfazer" da coluna Pagos faz o mesmo.

**Pendentes**
Filtro de dia com "Todos os dias", busca, faixa de números (Em aberto, Pessoas, Há mais de 2 semanas, Recebido agora) e
grupos "Há mais de 2 semanas" e "Recentes". "Receber" pede a forma: Pix ou Dinheiro; depois mostra
"Pago via Pix" com Desfazer.

**Cardápio**
O Cardápio vem antes do dia: os itens se cadastram aqui, com ou sem dia de venda, e depois cada dia
escolhe quais vende e quanto tem de cada um.
- "Adicionar item" (nome + preço padrão) funciona sempre. Com um dia aberto, o item novo já entra
  à venda nele. Depois de "Salvar item" o formulário continua aberto, limpo e com o foco no nome,
  com a confirmação "Pastel entrou no cardápio." em `ok`, para cadastrar vários em seguida.
  "Cancelar" (que vira "Fechar" depois do primeiro item salvo) fecha.
- Sem dia de venda: os itens aparecem em "Itens cadastrados", com o preço padrão (ver "Primeiro uso").
- Com dia: filtro de dia e lista de itens com preço neste dia (editável pelo lápis; selo quando
  difere do padrão), **quantidade neste dia**, vendidos no dia e switch "À venda / Fora" para o
  cardápio daquele dia. Desktop: tabela com as colunas Item, Preço neste dia, Quantidade, Vendidos,
  No cardápio do dia. Celular: cartão com preço e quantidade embaixo do nome, só quando à venda.
- Quantidade: "50 · restam 32"; "2" com o selo "Esgotado" (`warn`) quando não resta nada; ou
  "Sem limite". O lápis troca o texto por um campo numérico, como o preço: Enter salva, Esc cancela,
  vazio = sem limite. Mudar a quantidade não põe nem tira o item do cardápio do dia.

## Dias de venda

O protótipo não mostra como um dia de venda nasce. Esta seção define isso.

**Filtro de dia**
- Um dia aparece como "Dom, 15 nov", com o nome do dia em `muted` (cortado com "…" quando não
  cabe) e um selo: "hoje" (verde) no dia de hoje; senão "próximo" no primeiro dia depois de hoje.
- Dia aberto ao entrar em Vendas e Cardápio: hoje, se existir; senão o próximo dia; senão o mais
  recente. Painel e Pendentes abrem em "Todos os dias".
- Setas: ‹ vai para o dia anterior (mais antigo), › para o seguinte (mais novo). Ficam desativadas
  nas pontas e somem em "Todos os dias".
- A lista de dias abre num popover ancorado no botão (tablet e desktop, 320px de largura, até
  380px de altura com rolagem) ou numa folha "Escolher dia" (celular). Itens: "Todos os dias"
  primeiro (só Painel e Pendentes), depois os dias do mais novo para o mais antigo, agrupados por
  mês. O dia escolhido tem um ✓ e a lista já abre rolada até ele. Escolher fecha a lista.
- Painel, "Vendido por dia": os 8 dias mais recentes e um link "Ver anteriores".

**Criar dia** (só em Vendas e Cardápio; Painel e Pendentes só filtram)
- "+ Novo dia de venda" fica no rodapé da lista de dias, fora da rolagem.
- Fecha a lista e abre um popover ancorado no filtro (desktop) ou uma folha de baixo para cima
  (celular), igual à folha de Nova venda. Título "Novo dia de venda".
  1. **Data** (obrigatória). Padrão: o próximo domingo que ainda não tem dia (hoje, se hoje for
     domingo e ainda não existir).
  2. **Nome** (opcional), placeholder "Ex.: Culto de jovens". Sem nome, o filtro mostra só a data.
  3. **Cardápio**, segmentado:
     - "Copiar de [dia ▾]" (padrão): mesmos itens à venda e mesmos preços do dia escolhido. A lista
       traz os dias existentes, com o mais recente selecionado.
     - "Preço padrão": todos os itens ativos à venda, cada um com o preço padrão.
  4. Botões "Cancelar" e "Criar dia · 15 nov" (primário).
- Data repetida: aviso inline em `warn` ("Já existe um dia em 15 nov."), link "Abrir esse dia"
  (seleciona o dia e fecha) e botão de criar desativado.
- Depois de criar: o novo dia fica selecionado. No Cardápio, a lista já mostra os itens
  copiados, prontos para ajustar.

**Primeiro uso: primeiro os itens, depois o dia**
- Cardápio sem nenhum item: card centralizado "Nenhum item no cardápio ainda", explicando que o dia
  de venda vem depois, com o botão primário "Adicionar item".
- Cardápio com itens e sem dia: o card "Nenhum dia de venda ainda", "Agora crie o primeiro dia de
  venda. Os itens cadastrados entram à venda nele com o preço padrão." e o botão primário
  "Criar dia de venda" (abre o mesmo popover/folha). Abaixo, a lista "Itens cadastrados".
- Vendas sem nenhum item: card "Cadastre os itens no Cardápio" com o botão "Ir para o Cardápio".
  Com itens e sem dia: o mesmo card "Nenhum dia de venda ainda" do Cardápio.
- Painel e Pendentes: números zerados e um link "Criar o primeiro dia em Vendas".

**Dia criado por engano**
- Enquanto o dia não tiver nenhum pedido, o título por extenso do dia (Vendas e Cardápio) mostra
  um link discreto "Remover dia", com confirmação. O dia some da lista de dias (`cancelado_em`). Para
  trocar a data, remova e crie de novo. Com pedidos, o dia não pode ser removido.

## Regras de negócio que o design assume

- Vocabulário da interface: **itens** (não "espetos"), **Pendente** (não "fiado"), **Cardápio**.
- **Reserva** = pedido feito antes do dia, ainda não entregue (`pedidos.status = 'recebido'`).
  "Entregar" muda para entregue; o pagamento continua Pago ou Pendente.
- **Preço por dia:** cada item tem um preço padrão e pode ter outro preço em cada dia de venda.
  Precisa de uma tabela nova (ex.: `precos_do_dia`: cantina_id, dia_id, produto_id, preco_centavos,
  ativo). Cada item vendido grava o preço usado (`itens_pedido.preco_unitario_centavos`), então mudar
  o cardápio não altera vendas antigas.
- **Quantidade por dia (estoque do dia):** cada item pode ter, em cada dia de venda, quantas unidades
  há para vender (`precos_do_dia.quantidade`; vazio = sem limite). Resta = quantidade − itens não
  cancelados de pedidos não cancelados do dia, **reservas incluídas** (a reserva separa a unidade).
  Em zero o item está esgotado naquele dia e o aparelho recusa vender ou reservar mais do que resta.
  Criar um dia copiando outro copia as quantidades; com "Preço padrão", o dia nasce sem limite.
- **Receber** registra um pagamento (`pagamentos`, forma `pix` ou `dinheiro`). Desfazer = `estornado_em`.
- Pendente antigo = em aberto há 14 dias ou mais.
- **Pagamento só em Pix ou Dinheiro**, inclusive no registro da venda. "Pago" sem forma não existe.
- **Um dia de venda por data.** O id do dia é derivado da data (UUID v5 de cantina + data), então
  dois aparelhos que criem o mesmo dia sem internet chegam ao mesmo registro. Remover um dia vazio
  grava `cancelado_em`; criar a mesma data de novo reativa o mesmo registro. Pelo mesmo motivo, o id
  de `precos_do_dia` é derivado de dia + item.
- **v1 sem login** e sem código de acesso. As vendas não registram quem vendeu (`vendedor_id`
  fica vazio). Se o login vier depois, o cartão do usuário volta ao rodapé do menu.
