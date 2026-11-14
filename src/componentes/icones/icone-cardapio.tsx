import { Icone } from "./icone";

export function IconeCardapio({ tamanho }: { tamanho?: number }) {
  return (
    <Icone tamanho={tamanho}>
      <path d="M7 2v20" />
      <path d="M4 2v6a3 3 0 0 0 6 0V2" />
      <path d="M17 2c-1.7 0-3 2-3 5s1.3 4 3 4v11" />
    </Icone>
  );
}
