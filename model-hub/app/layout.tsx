import type { Metadata } from "next";
import { Fraunces, Sora } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display-loaded",
});

const body = Sora({
  subsets: ["latin"],
  variable: "--font-body-loaded",
});

export const metadata: Metadata = {
  title: "Model Hub",
  description: "One signed-in workspace for OpenAI, Claude, Grok, Kimi, and the rest.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`} style={{
        // Wire next/font CSS variables into the design tokens.
        ["--font-display" as string]: "var(--font-display-loaded), Georgia, serif",
        ["--font-body" as string]: "var(--font-body-loaded), system-ui, sans-serif",
      }}>
        {children}
      </body>
    </html>
  );
}
