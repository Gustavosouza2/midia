import type { Metadata, Viewport } from "next";
// Fonte servida pelo próprio app (sem Google Fonts), para funcionar offline.
import "@fontsource-variable/mona-sans/wdth.css";
import "./globals.css";
import { Pwa } from "./pwa";

export const metadata: Metadata = {
  title: "Cantina da Mídia",
  description: "Vendas da cantina da equipe de mídia.",
  robots: { index: false, follow: false },
  applicationName: "Cantina da Mídia",
  appleWebApp: { capable: true, title: "Cantina", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0E0F12",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>
        <Pwa>{children}</Pwa>
      </body>
    </html>
  );
}
