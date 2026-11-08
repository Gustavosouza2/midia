import type { Metadata, Viewport } from "next";
// Fonte servida pelo próprio app (sem Google Fonts), para funcionar offline.
import "@fontsource-variable/mona-sans/wdth.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cantina da Mídia",
  description: "Vendas da cantina da equipe de mídia.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0E0F12",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
