import Link from "next/link";
import ToolCard from "@/components/tools/ToolCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NoviqLab — AI × DX × システム開発",
};

const activities = [
  {
    title: "TownCheck",
    description:
      "居住地選びを支援する住みやすさ情報プラットフォーム「TownCheck」の開発・運営",
  },
  {
    title: "AI ワークフロー",
    description: "生成AIを活用した業務効率化ワークフローの設計・構築",
  },
  {
    title: "Web / SaaS 開発",
    description: "WebアプリケーションおよびSaaSプロダクトの企画・開発",
  },
  {
    title: "福祉・医療支援",
    description: "福祉・医療分野向け業務支援システムの設計・開発",
  },
  {
    title: "NPO・文化団体 DX",
    description:
      "NPO・文化団体のデジタル化支援（仮想ギャラリー・地域文化DXなど）",
  },
];

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <span className="font-mono text-lg font-semibold tracking-tight text-white">
            NoviqLab
          </span>
          <nav className="flex items-center gap-6">
            <Link
              href="/about"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              運営理念
            </Link>
            <Link
              href="/contact"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              お問い合わせ
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 sm:py-32 w-full">
        <div className="mb-4">
          <span className="inline-block font-mono text-xs text-sky-400 tracking-widest uppercase border border-sky-800 rounded px-2 py-1">
            ノヴィックラボ
          </span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight mb-6">
          AI × DX × システム開発
        </h1>
        <p className="text-lg md:text-xl text-sky-400 font-semibold italic mt-3 mb-4">
          Less, but better.
        </p>
        <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-2xl">
          NoviqLab（ノヴィックラボ）は、AI技術の活用・DX支援・システム開発を手がける日本のプロジェクトです。
        </p>

        {/* スクロール誘導 */}
        <div className="mt-16 mb-8 flex flex-col items-center">
          <a
            href="#activities"
            className="group flex flex-col items-center gap-2 text-slate-500 hover:text-sky-400 transition-colors"
            aria-label="下のセクションへスクロール"
          >
            <span className="text-xs font-mono tracking-widest">下へスクロール</span>
            <svg
              className="w-5 h-5 animate-bounce-slow"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </a>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6 w-full">
        <div className="border-t border-slate-800" />
      </div>

      {/* Activities */}
      <section id="activities" className="scroll-mt-8 max-w-4xl mx-auto px-6 py-16 w-full">
        <h2 className="font-mono text-xs text-slate-500 tracking-widest uppercase mb-10">
          主な活動
        </h2>
        <ul className="space-y-6">
          {activities.map((item) => (
            <li key={item.title} className="flex gap-4">
              <span className="mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-sky-500 ring-4 ring-sky-500/20" />
              <div>
                <span className="block text-xs font-mono text-sky-400 mb-1">
                  {item.title}
                </span>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* 次セクションへの誘導 */}
        <div className="mt-12 mb-4 flex flex-col items-center">
          <a
            href="#tools"
            className="group flex flex-col items-center gap-2 text-slate-500 hover:text-sky-400 transition-colors"
            aria-label="ツールセクションへスクロール"
          >
            <span className="text-xs font-mono tracking-widest">ツールへ</span>
            <svg
              className="w-4 h-4 animate-bounce-slow"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </a>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6 w-full">
        <div className="border-t border-slate-800" />
      </div>

      {/* Tools */}
      <section id="tools" className="scroll-mt-8 max-w-4xl mx-auto px-6 py-16 w-full">
        <h2 className="font-mono text-xs text-slate-500 tracking-widest uppercase mb-4">
          Tools
        </h2>
        <p className="text-slate-400 text-sm mb-8">
          ブラウザ内で完結する開発者向けユーティリティ。全て無料公開。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <ToolCard
            slug="image-resizer"
            name="Image Converter"
            icon="🖼"
            description="画像のリサイズ・形式変換。Web制作バッチ・容量自動調整対応。"
            tags={["PNG", "JPEG", "WebP"]}
          />
          <ToolCard
            slug="image-splitter"
            name="Image Splitter"
            icon="✂️"
            description="縦長キャプチャ画像を印刷やSlack共有に適したサイズに分割。ブラウザ内完結。"
            tags={["PNG", "JPEG", "WebP"]}
          />
        </div>

        {/* 次セクションへの誘導 */}
        <div className="mt-12 mb-4 flex flex-col items-center">
          <a
            href="#contact"
            className="group flex flex-col items-center gap-2 text-slate-500 hover:text-sky-400 transition-colors"
            aria-label="お問い合わせセクションへスクロール"
          >
            <span className="text-xs font-mono tracking-widest">問い合わせる</span>
            <svg
              className="w-4 h-4 animate-bounce-slow"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </a>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6 w-full">
        <div className="border-t border-slate-800" />
      </div>

      {/* CTA */}
      <section id="contact" className="scroll-mt-8 max-w-4xl mx-auto px-6 py-16 w-full">
        <p className="text-slate-400 text-sm mb-6">
          プロジェクトへのご相談・ご連絡はこちらから
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium px-6 py-3 rounded-lg transition-colors"
        >
          お問い合わせ
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </Link>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="mt-2 pt-4 border-t border-white/10">
            <p className="text-sm text-white/60 text-center leading-relaxed mb-2">
              🔒 NoviqLab のツールは、アップロードデータをサーバーに送信しません。
            </p>
            <p className="text-xs text-white/40 text-center">
              <a href="/about#privacy" className="underline hover:text-sky-400 transition-colors">
                プライバシー方針について
              </a>
            </p>
          </div>
          <p className="font-mono text-xs text-slate-600 mt-6">
            © {new Date().getFullYear()} NoviqLab
          </p>
        </div>
      </footer>
    </main>
  );
}
