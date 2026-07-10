import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
