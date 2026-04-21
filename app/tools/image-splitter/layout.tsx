import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image Splitter",
  description:
    "ブラウザ内で完結する画像分割ツール。縦長キャプチャ画像を印刷やSlack共有に適したサイズに賢く分割。PNG / JPEG / WebP 対応、サーバー送信なし。",
  openGraph: {
    title: "Image Splitter | NoviqLab",
    description:
      "ブラウザ内で完結する画像分割ツール。縦長キャプチャ画像を印刷やSlack共有に適したサイズに賢く分割。",
    url: "https://www.noviqlab.com/tools/image-splitter",
  },
};

export default function ImageSplitterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
