import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import NavBar from "./_components/NavBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AutoTube Factory",
  description: "AI-powered YouTube video automation — research, script, scenes, image prompts & voiceover in one pipeline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen flex flex-col`}>
        <NavBar />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">{children}</main>
        <footer className="border-t border-gray-800 py-5 text-center text-xs text-gray-600">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-center gap-4">
            <span>AutoTube Factory · AI-powered YouTube pipeline</span>
            <span>·</span>
            <Link href="/settings" className="hover:text-gray-400 transition-colors">⚙️ Settings</Link>
            <span>·</span>
            <Link href="/settings?tab=integrations" className="hover:text-gray-400 transition-colors">🔗 Integrations</Link>
            <span>·</span>
            <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">⚡ Get Groq Free</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
