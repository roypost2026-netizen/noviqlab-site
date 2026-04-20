"use client";

import { useState } from "react";
import Breadcrumb from "@/components/tools/Breadcrumb";
import SimpleMode from "./SimpleMode";

// TODO: Day 2 - localStorage でモード記憶
// const STORAGE_KEY = "image-resizer-mode";

export default function ImageResizerPage() {
  const [mode, setMode] = useState<"simple" | "batch">("simple");

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

      {/* Mode tabs */}
      <div className="border-b border-white/10 mb-6 px-2">
        <div className="flex gap-6">
          <button
            onClick={() => setMode("simple")}
            className={`pb-3 text-sm font-medium transition-colors ${
              mode === "simple"
                ? "border-b-2 border-sky-400 text-white"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            シンプル
          </button>
          <button
            disabled
            className="pb-3 text-sm font-medium text-white/20 opacity-40 cursor-not-allowed"
            title="Coming soon"
          >
            Web制作バッチ
          </button>
        </div>
      </div>

      {mode === "simple" && <SimpleMode />}
    </div>
  );
}
