import type { Cart } from "./cart";

/** The order being put together on the Sales screen, kept while the phone's sheet opens and closes. */
export type Draft = { cart: Cart; type: "sale" | "reservation"; name: string };

export const EMPTY_DRAFT: Draft = { cart: [], type: "sale", name: "" };
