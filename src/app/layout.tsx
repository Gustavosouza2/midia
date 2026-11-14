import type { Metadata, Viewport } from "next";
// Fonte servida pelo próprio app (sem Google Fonts), para funcionar offline.
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "./globals.css";
import { Pwa } from "./pwa";

export const metadata: Metadata = {
  title: "Cantina da Mídia",
  description: "Vendas da cantina da equipe de mídia.",
  robots: { index: false, follow: false },
  applicationName: "Cantina da Mídia",
  appleWebApp: { capable: true, title: "Cantina", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#F2F2F3",
  colorScheme: "light",
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
