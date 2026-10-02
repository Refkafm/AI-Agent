import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Astra Workspace — Your little IT team",
  description: "A cozy 3D workspace for Agent, Astra, Rodeo, Alpha and Delta.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
