import { Icon } from "./icon";

export function MenuIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M7 2v20" />
      <path d="M4 2v6a3 3 0 0 0 6 0V2" />
      <path d="M17 2c-1.7 0-3 2-3 5s1.3 4 3 4v11" />
    </Icon>
  );
}
