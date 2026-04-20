import Link from "next/link";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-mono text-lg font-semibold tracking-tight text-white hover:text-white/80 transition-colors">
            NoviqLab
          </Link>
          <Link href="/contact" className="text-sm text-slate-400 hover:text-white transition-colors">
            Contact
          </Link>
        </div>
      </header>
      <div className="flex-1 py-8">
        {children}
      </div>
    </div>
  );
}
