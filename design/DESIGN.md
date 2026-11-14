# Design: Cantina da Mídia (v1)

Visual reference for building the screens. The source of truth for the visuals is the files in
`design/screens/`. They are prototypes (HTML plus a JS class with sample logic). Read the markup and
the inline styles to copy the look, but build with the project's components (Next.js + Tailwind).
The data inside them is sample data and must not be copied into the app.

Some decisions came after the prototypes (payment in Sales, creating a sale day).
**Where this document and a prototype disagree, this document wins.**

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
  "Principal" label, links Painel, Vendas, Pendentes (with a counter), Cardápio. Active item: black
  background, white text. No search and no settings. **No user card (v1 has no login):** the menu
  footer shows only "Equipe de mídia · Casa do Pai", with no name and no initials.
- **Page top:** breadcrumb with the page name on the left; on the right, the main action.
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

**Sales (Vendas)**
1. Title, the day written out, a link to the Menu and the day filter (see "Sale days").
2. Single-row form: Venda/Reserva, Quem, Item (from the day's menu), Qtd, Preço un.
   (comes from the menu and can be changed for this sale only), **Pagamento: Pendente | Pix | Dinheiro**
   (segmented, default Pendente; replaces the prototype's Pago/Pendente), and the button
   "Registrar · R$ X" or "Reservar · R$ X". Pix or Dinheiro records the payment together with the
   sale.
   - An item with a quantity on the day shows what remains: "Espeto de carne · R$ 12 · restam 5".
     A sold-out item stays in the list, disabled, with "esgotado". The Qtd "+" stops at what remains.
   - If another order sells the item out before submitting, the error shows in `warn` below the
     form: "Só restam 3 de Espeto de carne." or "Espeto de carne esgotou."
3. The day's stat strip: Itens vendidos, Recebido, Pendente, Reservas.
4. "Pedidos do dia": customer search, Todos/Reservas/Pendentes/Pagos filter and Lista/Quadro view.
   The board has 3 columns: Reservas → Pendentes → Pagos.
5. Changing the payment later, in the list or on the board, follows the Pending pattern:
   - the "Pendente" badge or the "Marcar pago" button opens the **Pix · Dinheiro · ×** choice in its
     place;
   - the "Pago" badge shows the method ("Pago · Pix") and, when tapped, offers "Desfazer" (refunds
     the payment); on the board, "Desfazer" in the Pagos column does the same.

**Pending (Pendentes)**
Day filter with "Todos os dias", search, stat strip (Em aberto, Pessoas, Há mais de 2 semanas,
Recebido agora) and the groups "Há mais de 2 semanas" and "Recentes". "Receber" asks for the method:
Pix or Dinheiro; then it shows "Pago via Pix" with Desfazer.

**Menu (Cardápio)**
The Menu comes before the day: items are registered here, with or without a sale day, and then each
day chooses which ones it sells and how many it has of each.
- "Adicionar item" (name + default price) always works. With a day open, the new item goes on sale
  there right away. After "Salvar item" the form stays open, cleared and with focus on the name, with
  the confirmation "Pastel entrou no cardápio." in `ok`, so several can be registered in a row.
  "Cancelar" (which becomes "Fechar" after the first saved item) closes it.
- Without a sale day: the items appear under "Itens cadastrados", with the default price (see
  "First use").
- With a day: the day filter and the item list with the price on this day (editable with the pencil;
  a badge when it differs from the default), **the quantity on this day**, units sold that day and the
  "À venda / Fora" switch for that day's menu. Desktop: a table with the columns Item, Preço neste
  dia, Quantidade, Vendidos, No cardápio do dia. Phone: a card with the price and quantity below the
  name, only when for sale.
- Quantity: "50 · restam 32"; "2" with the "Esgotado" badge (`warn`) when nothing remains; or
  "Sem limite". The pencil swaps the text for a numeric input, like the price: Enter saves, Esc
  cancels, empty = no limit. Changing the quantity neither adds the item to nor removes it from the
  day's menu.

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
