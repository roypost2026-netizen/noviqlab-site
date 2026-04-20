"use client";

import { useState, useEffect } from "react";
import Breadcrumb from "@/components/tools/Breadcrumb";
import SimpleMode from "./SimpleMode";
import BatchMode from "./BatchMode";

type Mode = "simple" | "batch";
const MODE_STORAGE_KEY = "image-resizer-mode";

export default function ImageResizerPage() {
  const [mode, setMode] = useState<Mode>("simple");
  const [hydrated, setHydrated] = useState(false);

  // SSR 対応: クライアント側でのみ localStorage を読む
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY) as Mode | null;
      if (saved === "simple" || saved === "batch") setMode(saved);
    } catch {
      // プライベートブラウジング等
    }
    setHydrated(true);
  }, []);

  const handleModeChange = (next: Mode) => {
    setMode(next);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 w-full">
      <div className="px-2 mb-6">
        <Breadcrumb
          items={[
            { label: "NoviqLab", href: "/" },
            { label: "Tools", href: "/tools" },
            { label: "Image Converter" },
          ]}
        />
      </div>

      {/* モード切替タブ */}
      <div className="border-b border-white/10 mb-6 px-2">
        <div className="flex gap-6">
          <button
            onClick={() => handleModeChange("simple")}
            className={`pb-3 text-sm font-medium transition-colors ${
              mode === "simple"
                ? "border-b-2 border-sky-400 text-white"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            シンプル
          </button>
          <button
            onClick={() => handleModeChange("batch")}
            className={`pb-3 text-sm font-medium transition-colors ${
              mode === "batch"
                ? "border-b-2 border-sky-400 text-white"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            Web制作バッチ
          </button>
        </div>
      </div>

      {/* hydration 前は何も描画しない（モードちらつき防止） */}
      {hydrated && (
        <>
          {mode === "simple" && <SimpleMode />}
          {mode === "batch" && <BatchMode />}
        </>
      )}
    </div>
  );
}
