"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/projects", label: "Projects", icon: "📁" },
  { href: "/memory", label: "Topics", icon: "🧠" },
  { href: "/digest", label: "Digest", icon: "📊" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-800 bg-gray-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-white hover:text-purple-400 transition-colors shrink-0">
          <span className="text-2xl">🎬</span>
          <span className="hidden sm:inline text-lg">AutoTube Factory</span>
          <span className="sm:hidden text-base">AutoTube</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-purple-900/30 text-purple-300 font-medium"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <span>{link.icon}</span>
                <span className="hidden md:inline">{link.label}</span>
              </Link>
            );
          })}

          {/* New Video CTA */}
          <Link
            href="/new"
            className={`ml-1 flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              pathname === "/new"
                ? "bg-purple-700 text-white"
                : "bg-purple-600 hover:bg-purple-500 text-white"
            }`}
          >
            <span className="hidden sm:inline">🎬 New Video</span>
            <span className="sm:hidden">+</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
