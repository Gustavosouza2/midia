import { Icone } from "./icon";

export function IconePendentes({ tamanho }: { tamanho?: number }) {
  return (
    <Icone tamanho={tamanho}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icone>
  );
}
