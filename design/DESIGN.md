# Design: Cantina da Mídia (v1)

Visual reference for building the screens. The source of truth for the visuals is the files in
`design/screens/`. They are prototypes (HTML plus a JS class with sample logic). Read the markup and
the inline styles to copy the look, but build with the project's components (Next.js + Tailwind).
The data inside them is sample data and must not be copied into the app.

Some decisions came after the prototypes (payment in Sales, creating a sale day).
**Where this document and a prototype disagree, this document wins.** The v2 UX refactor (fewer
taps, Sales as the home screen) changed Sales, Pending and Menu; the prototypes predate it.

The UI is in Portuguese, so labels, button text and messages are quoted here exactly as the user sees
them.

| Screen | Desktop | Phone |
|---|---|---|
| Dashboard (Painel) | `screens/Dashboard.dc.html` | `screens/Mobile-Dashboard.dc.html` |
| Sales (Vendas) | `screens/Sales.dc.html` | `screens/Mobile-Sales.dc.html` |
| Pending (Pendentes) | `screens/Pending.dc.html` | `screens/Mobile-Pending.dc.html` |
| Menu (Cardápio) | `screens/Menu.dc.html` | `screens/Mobile-Menu.dc.html` |

## Tokens

Light theme only. One primary color (black) for actions; green for received money and data.

The names follow the shadcn/ui vocabulary (`src/app/globals.css`), so the components in
`src/components/ui` use these colors without adjustment.

| Token | Value | Use |
|---|---|---|
| `page` | `#F2F2F3` | background behind the app frame |
| `background` / `card` / `popover` | `#FFFFFF` | frame, cards, popovers |
| `muted` | `#FAFAFA` | section headers, inputs, tabs |
| `accent` / `secondary` | `#F4F4F5` | hover, counters |
| `border` | `#ECECEE` | borders and dividers |
| `input` | `#E2E2E5` | button and input borders |
| `foreground` | `#111113` | main text |
| `text-2` | `#3F3F46` | secondary text |
| `muted-foreground` | `#6B6B74` | labels, captions |
| `primary` | `#111113` | main button, active menu item, selected segment |
| `primary-foreground` | `#FFFFFF` | text on primary |
| `ok` | `#00716A` | green only in status badges ("Pago", "hoje"); also `ring` (focus). Text stays in `foreground` |
| `ok-fill` | `#359E95` | green (fill): bars, switches |
| `ok-soft` | `#E6F4F2` | "Pago" badge background |
| `warn` | `#B4400E` | orange: pending, old pending; also `destructive` |
| `warn-soft` | `#FFF1E8` | "Pendente" badge background |

Floating element shadow: `0 1px 2px rgba(17,17,19,.06), 0 8px 24px rgba(17,17,19,.06)`.

**Typography:** Poppins everywhere (weights 400, 500, 600 and 700), served by the app itself
(`@fontsource/poppins`), so it works offline.
Base 13px / 1.5, numbers with `tabular-nums`. Page titles 26px weight 600 (phone 18px).
Highlight values 22–24px weight 600. Labels 11px in the `muted` color.

**Radii:** frame 14px, cards 12px, buttons and inputs 8px (phone 9–10px), chips 99px.

## Motion

Short and meaningful; everything turns off with `prefers-reduced-motion`. Timings live in `globals.css`.

- **Switching screens from the menu:** the old content fades out in 140ms and the new one rises 8px
  and fades in over 220ms (`ScreenTransition`, React View Transitions). The frame (menu, header, tab
  bar) stays still.
- **Switching day or period on the same screen:** a soft crossfade of what changes (`SmoothSwap` +
  `startTransition`); the day filter shows the new day right away, and repeated taps on the arrows
  move one day each.
- **Bars** grow (500ms); hover and tab **colors** change in 200ms.
- **New rows** and the **Pix · Dinheiro · ×** choice enter with a short fade (200–300ms).

## Components

- **Frame (desktop):** `page` background with 16px padding; inside, a white panel with a border and
  a 14px radius.
- **Side menu (232px):** brand (black square with a skewer icon + "Cantina / Mídia · Casa do Pai"),
  "Principal" label, links Vendas, Pendentes (with a counter, also on the phone tab bar), Cardápio,
  Painel: the main task first. Active item: black background, white text. No search and no settings. **No user card (v1 has no login):** the menu
  footer shows only "Equipe de mídia · Casa do Pai", with no name and no initials.
- **Page top:** the page title (with the day written out) on the left; on the right, the day filter
  or the main action. No breadcrumb: the menu already says where you are.
  No notification bell (desktop and phone).
- **Day filter:** `‹ [📅 Dom, 15 nov · hoje · name ▾] ›`, the same on all four screens. The middle
  button shows the selected day and opens the day list; the arrows move one day. Phone: 44px tall,
  full width. Tablet and desktop: 34px tall, middle button 288px wide.
  Rules in "Sale days", below.
- **Tabs:** segmented group with a `muted` background; active tab with a white background and a
  shadow (filter and view of the day's orders).
- **Stat strip:** a single card split into 4 columns by vertical lines (2×2 on smaller screens).
- **Status badges:** Pago (green), Pendente (orange), Reservado (neutral with a border).
- **Table:** header with the `sub` background, rows with dividers; pagination 6 at a time
  ("Mostrando 1–6 de 12", Anterior / numbers / Próxima).
- **Phone:** white header, scrolling content, tab bar fixed at the bottom (4 items; the active one
  has its icon on a black background). Lists as cards; "Carregar mais" instead of pagination. New
  sale is a floating button that opens a bottom sheet with the form.
- **Desktop responsiveness:** at ≤1180px the stat strip becomes 2×2 and columns stack; at ≤860px the
  side menu becomes a top bar; at ≤560px the menu links become 4 text-only columns.

## Screens

**Dashboard (Painel)**
1. Welcome widget (no image and no buttons): "BEM-VINDO DE VOLTA" in black, the title
   "Painel da Cantina" and, on the right, the upcoming sale day with its number of reservations.
2. Day filter with "Todos os dias" (default).
3. Stat strip: Recebido (bar with the % received), Pendente, Itens vendidos, Reservas.
4. "Vendido por dia": one row per day with a horizontal bar (solid green = received, striped green =
   pending). Clicking a row filters by that day.
5. "Precisa de atenção": reservations to deliver and the 3 oldest pending orders, with a link to
   Pending.

**Sales (Vendas)**: the home screen (`/`), built like a shop counter.
1. Title, the day written out and the day filter. It opens on today's sale day. When today has no
   day, the card "Vendas de hoje ainda não abertas" has one button, "Abrir vendas de hoje", which
   creates today's day copying the latest day's menu (or every item at its default price on the
   first day). Other dates stay in the day filter's "+ Novo dia de venda".
2. "Toque para adicionar": the day's items as large tiles (name, price, "restam N" / "esgotado").
   Each tap adds one unit to the order; the tile shows how many are in it and stops at what remains.
   "Editar cardápio do dia" links to the Menu.
3. The order panel ("Pedido"): beside the tiles on desktop; on phone and tablet a black bar
   ("2 itens · R$ 20 · Cobrar") opens it in a bottom sheet. It has Venda | Reserva, the lines with
   − / + , "Nome" (suggests known customers), the total and three buttons: **Pix**, **Dinheiro**,
   **Pendente**. The payment button records the order; there is no separate submit. A name is
   required only for Pendente and for reservations ("Escreva o nome de quem vai pagar depois.").
4. After recording, a confirmation ("Venda registrada · R$ 32 no Pix") offers **Desfazer** for six
   seconds: the order is canceled (`status = cancelado`, payments refunded) and the items go back to
   the order panel.
5. "Resumo do dia" in one compact row: Vendido, Recebido, Pendente, Reservas.
6. "Pedidos do dia": customer search and Todos / Pendentes / Reservas / Pagos with counts. No board
   view and no pagination. Each order has one action, one tap: Pendente → **Pix** / **Dinheiro**;
   Pago → **Desfazer**; Reservado → **Entregar**.

**Pending (Pendentes)**
Day filter with "Todos os dias", a "Resumo" (Em aberto, Pessoas, Há mais de 2 semanas) and a
full-width "Buscar pessoa pelo nome". One entry per person, whoever owes longest first, with the
total and an age badge (orange after 2 weeks). **Pix** / **Dinheiro** beside the person pay all of
their open orders in one tap; then "Pago via Pix" with Desfazer. A person with several orders also
lists them, each with its own smaller Pix / Dinheiro.

**Menu (Cardápio)**
The Menu comes before the day: items are registered here, and each day chooses which ones it sells,
at what price and how many.
- A "Novo item · R$ · Adicionar" row at the top of the list. Enter adds, the item goes on sale on the
  selected day, "Pastel entrou no cardápio." shows in `ok` and the cursor returns to the name.
- Each row: name, **price on this day** and **quantity** as plain inputs (blur or Enter saves, Esc
  reverts, empty quantity = "Sem limite"), "restam N" / "Esgotado", units sold and the "À venda /
  Fora" switch. "padrão R$ X" appears only when the day's price differs from the default.
- It opens on today's day. Without one, "Abrir vendas de hoje" (one tap); other days through the
  day filter. With no day at all, the items appear under "Itens cadastrados".

## Sale days

The prototype does not show how a sale day is born. This section defines it.

**Day filter**
- A day shows as "Dom, 15 nov", with the day name in `muted` (truncated with "…" when it does not
  fit) and a badge: "hoje" (green) on today's day; otherwise "próximo" on the first day after today.
- Day opened when entering Sales and Menu: today, if it exists; otherwise the upcoming day; otherwise
  the most recent. Dashboard and Pending open on "Todos os dias".
- Arrows: ‹ goes to the previous (older) day, › to the next (newer). They are disabled at the ends
  and hidden on "Todos os dias".
- The day list opens in a popover anchored to the button (tablet and desktop, 320px wide, up to
  380px tall with scrolling) or in an "Escolher dia" sheet (phone). Items: "Todos os dias" first
  (Dashboard and Pending only), then the days newest first, grouped by month. The selected day has
  a ✓ and the list opens already scrolled to it. Selecting closes the list.
- Dashboard, "Vendido por dia": the 8 most recent days and a "Ver anteriores" link.

**Creating a day** (Sales and Menu only; Dashboard and Pending only filter)
- "+ Novo dia de venda" sits at the bottom of the day list, outside the scroll.
- It closes the list and opens a popover anchored to the filter (desktop) or a bottom sheet (phone),
  like the Nova venda sheet. Title "Novo dia de venda".
  1. **Data** (required). Default: the next Sunday that has no day yet (today, if today is Sunday and
     it does not exist yet).
  2. **Nome** (optional), placeholder "Ex.: Culto de jovens". Without a name, the filter shows only
     the date.
  3. **Cardápio**, segmented:
     - "Copiar de [day ▾]" (default): the same items for sale and the same prices as the chosen day.
       The list has the existing days, with the most recent selected.
     - "Preço padrão": every active item for sale, each at its default price.
  4. Buttons "Cancelar" and "Criar dia · 15 nov" (primary).
- Duplicate date: inline warning in `warn` ("Já existe um dia em 15 nov."), an "Abrir esse dia" link
  (selects the day and closes) and the create button disabled.
- After creating: the new day is selected. On the Menu, the list already shows the copied items,
  ready to adjust.

**First use: items first, then the day**
- Menu without any item: a centered card "Nenhum item no cardápio ainda", explaining that the sale
  day comes later, with the primary button "Adicionar item".
- Menu with items and no day: the card "Nenhum dia de venda ainda", "Agora crie o primeiro dia de
  venda. Os itens cadastrados entram à venda nele com o preço padrão." and the primary button
  "Criar dia de venda" (opens the same popover/sheet). Below it, the "Itens cadastrados" list.
- Sales without any item: the card "Cadastre os itens no Cardápio" with the button "Ir para o
  Cardápio". With items and no day: the same "Nenhum dia de venda ainda" card as the Menu.
- Dashboard and Pending: zeroed stats and a "Criar o primeiro dia em Vendas" link.

**Day created by mistake**
- While the day has no orders, the day's written-out title (Sales and Menu) shows a discreet
  "Remover dia" link, with confirmation. The day leaves the day list (`cancelado_em`). To change the
  date, remove it and create it again. With orders, the day cannot be removed.

## Business rules the design assumes

- UI vocabulary: **itens** (not "espetos"), **Pendente** (not "fiado"), **Cardápio**.
- **Reservation** = an order placed before the day, not delivered yet (`pedidos.status = 'recebido'`).
  "Entregar" changes it to delivered; the payment stays Pago or Pendente.
- **Price per day:** each item has a default price and may have a different price on each sale day.
  Stored in `precos_do_dia` (cantina_id, dia_id, produto_id, preco_centavos, ativo). Each sold item
  records the price used (`itens_pedido.preco_unitario_centavos`), so changing the menu does not
  change past sales.
- **Quantity per day (the day's stock):** on each sale day, each item may have a number of units to
  sell (`precos_do_dia.quantidade`; empty = no limit). Remaining = quantity − non-canceled items of
  the day's non-canceled orders, **reservations included** (a reservation holds the unit). At zero
  the item is sold out that day and the device refuses to sell or reserve more than what remains.
  Creating a day by copying another copies the quantities; with "Preço padrão", the day starts
  without a limit.
- **Receber** records a payment (`pagamentos`, method `pix` or `dinheiro`). Desfazer =
  `estornado_em`.
- Old pending = outstanding for 14 days or more.
- **Payment only by Pix or Dinheiro**, including when recording the sale. "Pago" without a method
  does not exist.
- **One sale day per date.** The day id is derived from the date (UUID v5 of canteen + date), so two
  devices that create the same day without internet end up with the same record. Removing an empty
  day writes `cancelado_em`; creating the same date again reactivates the same record. For the same
  reason, the `precos_do_dia` id is derived from day + item.
- **v1 has no login** and no access code. Sales do not record who sold them (`vendedor_id` stays
  empty). If login comes later, the user card returns to the menu footer.
