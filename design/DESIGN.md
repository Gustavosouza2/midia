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

| Token | Valor | Uso |
|---|---|---|
| `page` | `#F2F2F3` | fundo atrás da moldura do app |
| `bg` | `#FFFFFF` | moldura, cards |
| `sub` | `#FAFAFA` | cabeçalhos de seção, campos, abas |
| `hover` | `#F4F4F5` | hover, contadores |
| `line` | `#ECECEE` | bordas e divisórias |
| `line-2` | `#E2E2E5` | bordas de botões e campos |
| `text` | `#111113` | texto principal |
| `text-2` | `#3F3F46` | texto secundário |
| `muted` | `#6B6B74` | rótulos, legendas |
| `primary` | `#111113` | botão principal, item ativo do menu, segmento selecionado |
| `on-primary` | `#FFFFFF` | texto sobre primary |
| `accent` | `#00716A` | verde (texto): "Bem-vindo de volta", recebido, pago |
| `accent-fill` | `#359E95` | verde (preenchimento): barras, switches |
| `accent-soft` | `#E6F4F2` | fundo de selo "Pago" |
| `warn` | `#B4400E` | laranja: pendente, pendente antigo |
| `warn-soft` | `#FFF1E8` | fundo de selo "Pendente" |

Sombra de elementos flutuantes: `0 1px 2px rgba(17,17,19,.06), 0 8px 24px rgba(17,17,19,.06)`.

**Tipografia:** Geist Mono em tudo, servida pelo próprio app (`@fontsource-variable/geist-mono`),
para funcionar offline.
Base 13px / 1.5, números com `tabular-nums`. Títulos de página 26px peso 600 (celular 18px).
Valores de destaque 22–24px peso 600. Rótulos 11px na cor `muted`.

**Raios:** moldura 14px, cards 12px, botões e campos 8px (celular 9–10px), chips 99px.

## Componentes

- **Moldura (desktop):** fundo `page` com padding 16px; dentro, um painel branco com borda e raio 14px.
- **Menu lateral (232px):** marca (quadrado preto com ícone de espeto + "Cantina / Mídia · Casa do Pai"),
  rótulo "Principal", links Painel, Vendas, Pendentes (com contador), Cardápio. Item ativo: fundo preto,
  texto branco. Sem busca e sem Configurações. **Sem cartão de usuário (v1 sem login):** o rodapé do
  menu mostra só "Equipe de mídia · Casa do Pai", sem nome e sem iniciais.
- **Topo da página:** "migalha" com o nome da página à esquerda; à direita, a ação principal.
  Sem sino de avisos (desktop e celular).
- **Abas / filtro de dia:** grupo segmentado com fundo `sub`; aba ativa com fundo branco e sombra.
  O dia de venda é sempre um filtro (abas no desktop, chips com rolagem horizontal no celular).
  Regras das abas de dia em "Dias de venda", abaixo.
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
1. Widget de boas-vindas (sem imagem e sem botões): "BEM-VINDO DE VOLTA" em verde, título
   "Painel da Cantina" e, à direita, o próximo dia de venda com a quantidade de reservas.
2. Abas de período: Todos os dias + cada dia de venda.
3. Faixa de números: Recebido (barra de % recebido), Pendente, Itens vendidos, Reservas.
4. "Vendido por dia": uma linha por dia com barra horizontal (verde sólido = recebido, verde listrado =
   pendente). Clicar na linha filtra por aquele dia.
5. "Precisa de atenção": reservas para entregar e os 3 pendentes mais antigos, com link para Pendentes.

**Vendas**
1. Título, dia por extenso, link para o Cardápio, abas de dia e botão "+ Novo dia" depois das
   abas (ver "Dias de venda").
2. Formulário de uma linha: Venda/Reserva, Quem, Item (do cardápio do dia), Qtd, Preço un.
   (vem do cardápio e pode ser alterado só nesta venda), **Pagamento: Pendente | Pix | Dinheiro**
   (segmentado, padrão Pendente; substitui o Pago/Pendente do protótipo), botão
   "Registrar · R$ X" ou "Reservar · R$ X". Pix ou Dinheiro registra o pagamento junto com a venda.
3. Faixa de números do dia: Itens vendidos, Recebido, Pendente, Reservas.
4. "Pedidos do dia": busca de cliente, filtro Todos/Reservas/Pendentes/Pagos e visão Lista/Quadro.
   Quadro com 3 colunas: Reservas → Pendentes → Pagos.
5. Mudar o pagamento depois, na lista ou no quadro, segue o padrão de Pendentes:
   - selo "Pendente" ou botão "Marcar pago": abre a escolha **Pix · Dinheiro · ×** no lugar;
   - selo "Pago" mostra a forma ("Pago · Pix") e, ao tocar, oferece "Desfazer" (estorna o
     pagamento); no quadro, "Desfazer" da coluna Pagos faz o mesmo.

**Pendentes**
Filtro de dia, busca, faixa de números (Em aberto, Pessoas, Há mais de 2 semanas, Recebido agora) e
grupos "Há mais de 2 semanas" e "Recentes". "Receber" pede a forma: Pix ou Dinheiro; depois mostra
"Pago via Pix" com Desfazer.

**Cardápio**
Abas de dia, lista de itens com: preço neste dia (editável pelo lápis; selo quando difere do padrão),
vendidos no dia e switch "À venda / Fora" para o cardápio daquele dia. Botão "Adicionar item"
(nome + preço padrão). Botão "+ Novo dia" depois das abas (ver "Dias de venda").

## Dias de venda

O protótipo não mostra como um dia de venda nasce. Esta seção define isso.

**Abas de dia**
- Ordem: do mais novo para o mais antigo. O primeiro dia com data de hoje ou depois leva
  "· próximo" no rótulo (ex.: "15 nov · próximo").
- Aba aberta ao entrar na tela: hoje, se existir; senão o próximo dia; senão o mais recente.
- Desktop: mostra o próximo dia e os 4 mais recentes. Os anteriores ficam num botão
  "Anteriores ▾" no fim do grupo, que abre uma lista agrupada por mês. Celular: todos os dias nos
  chips com rolagem horizontal.
- Painel, "Vendido por dia": os 8 dias mais recentes e um link "Ver anteriores".

**Criar dia** (só em Vendas e Cardápio; Painel e Pendentes só filtram)
- Botão "+ Novo dia" logo depois das abas. Desktop: botão secundário (altura 30px, borda `line-2`,
  fundo `bg`). Celular: último chip da fileira, com borda tracejada.
- Abre um popover ancorado no botão (desktop) ou uma folha de baixo para cima (celular), igual à
  folha de Nova venda. Título "Novo dia de venda".
  1. **Data** (obrigatória). Padrão: o próximo domingo que ainda não tem dia (hoje, se hoje for
     domingo e ainda não existir).
  2. **Nome** (opcional), placeholder "Ex.: Culto de jovens". Sem nome, a aba mostra só a data.
  3. **Cardápio**, segmentado:
     - "Copiar de [dia ▾]" (padrão): mesmos itens à venda e mesmos preços do dia escolhido. A lista
       traz os dias existentes, com o mais recente selecionado.
     - "Preço padrão": todos os itens ativos à venda, cada um com o preço padrão.
  4. Botões "Cancelar" e "Criar dia · 15 nov" (primário).
- Data repetida: aviso inline em `warn` ("Já existe um dia em 15 nov."), link "Abrir esse dia"
  (seleciona a aba e fecha) e botão de criar desativado.
- Depois de criar: a aba do novo dia fica selecionada. No Cardápio, a lista já mostra os itens
  copiados, prontos para ajustar.

**Primeiro uso (nenhum dia ainda)**
- Vendas e Cardápio: no lugar do conteúdo, um card centralizado com "Nenhum dia de venda ainda",
  "Crie o primeiro dia para montar o cardápio e registrar vendas." e o botão primário
  "Criar dia de venda" (abre o mesmo popover/folha).
- Painel e Pendentes: números zerados e um link "Criar o primeiro dia em Vendas".

**Dia criado por engano**
- Enquanto o dia não tiver nenhum pedido, o título por extenso do dia (Vendas e Cardápio) mostra
  um link discreto "Remover dia", com confirmação. O dia some das abas (`cancelado_em`). Para
  trocar a data, remova e crie de novo. Com pedidos, o dia não pode ser removido.

## Regras de negócio que o design assume

- Vocabulário da interface: **itens** (não "espetos"), **Pendente** (não "fiado"), **Cardápio**.
- **Reserva** = pedido feito antes do dia, ainda não entregue (`pedidos.status = 'recebido'`).
  "Entregar" muda para entregue; o pagamento continua Pago ou Pendente.
- **Preço por dia:** cada item tem um preço padrão e pode ter outro preço em cada dia de venda.
  Precisa de uma tabela nova (ex.: `precos_do_dia`: cantina_id, dia_id, produto_id, preco_centavos,
  ativo). Cada item vendido grava o preço usado (`itens_pedido.preco_unitario_centavos`), então mudar
  o cardápio não altera vendas antigas.
- **Receber** registra um pagamento (`pagamentos`, forma `pix` ou `dinheiro`). Desfazer = `estornado_em`.
- Pendente antigo = em aberto há 14 dias ou mais.
- **Pagamento só em Pix ou Dinheiro**, inclusive no registro da venda. "Pago" sem forma não existe.
- **Um dia de venda por data.** O id do dia é derivado da data (UUID v5 de cantina + data), então
  dois aparelhos que criem o mesmo dia sem internet chegam ao mesmo registro. Remover um dia vazio
  grava `cancelado_em`; criar a mesma data de novo reativa o mesmo registro. Pelo mesmo motivo, o id
  de `precos_do_dia` é derivado de dia + item.
- **v1 sem login** e sem código de acesso. As vendas não registram quem vendeu (`vendedor_id`
  fica vazio). Se o login vier depois, o cartão do usuário volta ao rodapé do menu.
