import type { Metadata } from "next";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "./theme-toggle";

export const metadata: Metadata = {
  title: "Dentia AI | SaaS dental",
  description: "Recepcionista IA y gestion omnicanal para clinicas dentales"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
