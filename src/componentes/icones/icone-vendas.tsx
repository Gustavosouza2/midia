import { Icone } from "./icone";

export function IconeVendas({ tamanho }: { tamanho?: number }) {
  return (
    <Icone tamanho={tamanho}>
      <path d="M3 5h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20 8H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="17" cy="20" r="1" />
    </Icone>
  );
}
