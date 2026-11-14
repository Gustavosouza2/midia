import { Icone } from "./icone";

export function IconeEspeto({ tamanho = 17 }: { tamanho?: number }) {
  return (
    <Icone tamanho={tamanho} traco={2.2}>
      <path d="M4 20 20 4" />
      <path d="M8 12.5 11.5 16" />
      <path d="M11 9.5 14.5 13" />
      <path d="M14 6.5 17.5 10" />
    </Icone>
  );
}
