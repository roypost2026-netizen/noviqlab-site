import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image Converter",
  description:
    "ブラウザ内で完結する画像リサイズ・形式変換ツール。サーバー送信なし、個人情報自動削除。PNG / JPEG / WebP 対応。Web制作バッチモードで複数サイズ一括生成も可能。",
  openGraph: {
    title: "Image Converter | NoviqLab",
    description:
      "ブラウザ内で完結する画像リサイズ・形式変換ツール。サーバー送信なし、個人情報自動削除。",
    url: "https://www.noviqlab.com/tools/image-resizer",
  },
};

export default function ImageResizerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
