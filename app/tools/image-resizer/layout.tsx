import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image Converter | NoviqLab Tools",
  description:
    "画像のリサイズ・形式変換ツール。JPEG・PNG・WebP・AVIF対応。ブラウザ内で完結、サーバー送信なし。",
};

export default function ImageResizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
