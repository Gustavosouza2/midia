import { Icon } from "./icon";

export function SkewerIcon({ size = 17 }: { size?: number }) {
  return (
    <Icon size={size} weight={2.2}>
      <path d="M4 20 20 4" />
      <path d="M8 12.5 11.5 16" />
      <path d="M11 9.5 14.5 13" />
      <path d="M14 6.5 17.5 10" />
    </Icon>
  );
}
