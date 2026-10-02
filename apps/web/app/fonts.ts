import { Inter, Orbitron } from "next/font/google";

// Shared by the two documents that render <html>: the [locale] root layout and
// app/global-not-found.tsx (openspec/changes/root-document-lang). next/font must be
// called at module scope, so both import these instances rather than redeclaring them.

export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin-ext"],
  display: "swap",
});

export const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  display: "swap",
});

export const fontClassName = `${inter.variable} ${orbitron.variable} h-full antialiased`;
