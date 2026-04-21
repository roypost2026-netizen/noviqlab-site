"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  detectAvifSupport,
  canvasToBlob,
  stepDownResize,
  fillJpegBackground,
} from "./imageProcessor";
import type { OutputFormat } from "./types";
import InfoAccordion from "@/components/tools/common/InfoAccordion";
import { DESCRIPTIONS } from "./descriptions";
import UsageToggle from "@/components/tools/common/UsageToggle";
import IntroToggle from "@/components/tools/common/IntroToggle";

type FileStatus = "waiting" | "processing" | "done" | "error";

interface ImageFile {
  id: string;
  file: File;
  status: FileStatus;
  previewBefore: string;
  previewAfter?: string;
  outputBlob?: Blob;
  outputSize?: number;
  error?: string;
  originalWidth?: number;
  originalHeight?: number;
}

interface Settings {
  format: OutputFormat;
  quality: number;
  resizeEnabled: boolean;
  width: string;
  height: string;
  keepAspect: boolean;
  preset: string;
  brightness: number;
  contrast: number;
  saturation: number;
  bgColor: string;
}

const FORMAT_EXT: Record<OutputFormat, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const PRESETS = [
  { label: "X (旧Twitter)", width: 1200, height: 675 },
  { label: "Instagram", width: 1080, height: 1080 },
  { label: "OGP", width: 1200, height: 630 },
  { label: "フルHD", width: 1920, height: 1080 },
  { label: "4K", width: 3840, height: 2160 },
];

function calcAspectRatio(settings: Settings, files: ImageFile[]): number | null {
  if (!settings.keepAspect) return null;
  const firstFile = files.find((f) => f.originalWidth && f.originalHeight);
  if (firstFile?.originalWidth && firstFile?.originalHeight) {
    return firstFile.originalWidth / firstFile.originalHeight;
  }
  const w = Number(settings.width);
  const h = Number(settings.height);
  if (w > 0 && h > 0) return w / h;
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function processImage(
  file: File,
  settings: Settings
): Promise<{ blob: Blob; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      try {
        let targetW = img.width;
        let targetH = img.height;

        if (settings.resizeEnabled && (settings.width || settings.height)) {
          const w = parseInt(settings.width) || 0;
          const h = parseInt(settings.height) || 0;
          if (settings.keepAspect) {
            if (w && !h) {
              targetW = w;
              targetH = Math.round(img.height * (w / img.width));
            } else if (h && !w) {
              targetH = h;
              targetW = Math.round(img.width * (h / img.height));
            } else if (w && h) {
              targetW = w;
              targetH = h;
            }
          } else {
            if (w) targetW = w;
            if (h) targetH = h;
          }
        }

        // step-down resize（imageProcessor の共通関数を使用）
        const stepped = stepDownResize(img, targetW, targetH);

        const final = document.createElement("canvas");
        final.width = targetW;
        final.height = targetH;
        const ctx = final.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          return reject(new Error("Canvas 2D context の取得に失敗しました"));
        }

        // JPEG 背景色（imageProcessor の共通関数を使用）
        if (settings.format === "image/jpeg") {
          fillJpegBackground(ctx, targetW, targetH, settings.bgColor || "#ffffff");
        }

        const b = settings.brightness;
        const c = settings.contrast;
        const s = settings.saturation;
        ctx.filter = `brightness(${1 + b / 100}) contrast(${1 + c / 100}) saturate(${1 + s / 100})`;
        ctx.drawImage(stepped, 0, 0, targetW, targetH);

        URL.revokeObjectURL(url);

        // canvasToBlob（imageProcessor の共通関数を使用）
        const blob = await canvasToBlob(final, settings.format, settings.quality / 100);
        if (!blob) return reject(new Error("変換失敗"));
        const previewUrl = URL.createObjectURL(blob);
        resolve({ blob, previewUrl });
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    // 8.4: img.onerror 内で URL.revokeObjectURL
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像の読み込みに失敗しました"));
    };
    img.src = url;
  });
}

export default function SimpleMode() {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [settings, setSettings] = useState<Settings>({
    format: "image/jpeg",
    quality: 85,
    resizeEnabled: false,
    width: "",
    height: "",
    keepAspect: true,
    preset: "",
    brightness: 0,
    contrast: 0,
    saturation: 0,
    bgColor: "#ffffff",
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [avifSupported, setAvifSupported] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AVIF 検出 + アンマウント時の Object URL 全 revoke
  useEffect(() => {
    detectAvifSupport().then(setAvifSupported);

    return () => {
      setFiles((prev) => {
        prev.forEach((item) => {
          URL.revokeObjectURL(item.previewBefore);
          if (item.previewAfter) URL.revokeObjectURL(item.previewAfter);
        });
        return prev;
      });
    };
  }, []);

  // Esc でモーダルを閉じる（要件 4.6）
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedPreview(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter((f) => f.type.startsWith("image/"));
    const items: ImageFile[] = arr.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      status: "waiting",
      previewBefore: URL.createObjectURL(f),
    }));
    setFiles((prev) => [...prev, ...items]);

    // 元画像のサイズを取得してアスペクト比計算に利用
    items.forEach((item) => {
      const img = new Image();
      img.onload = () => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, originalWidth: img.naturalWidth, originalHeight: img.naturalHeight }
              : f
          )
        );
      };
      img.src = item.previewBefore;
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  // 8.4: removeFile 時に Object URL を revoke
  const removeFile = (id: string) => {
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewBefore);
        if (item.previewAfter) URL.revokeObjectURL(item.previewAfter);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setSettings((s) => ({
      ...s,
      resizeEnabled: true,
      width: String(preset.width),
      height: String(preset.height),
      preset: preset.label,
    }));
  };

  const processAll = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    const updated = [...files];
    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: "processing" };
      setFiles([...updated]);
      try {
        // 8.4: 再変換時、古い previewAfter を revoke
        if (updated[i].previewAfter) {
          URL.revokeObjectURL(updated[i].previewAfter!);
        }
        const { blob, previewUrl } = await processImage(updated[i].file, settings);
        updated[i] = {
          ...updated[i],
          status: "done",
          outputBlob: blob,
          outputSize: blob.size,
          previewAfter: previewUrl,
        };
      } catch (e) {
        updated[i] = { ...updated[i], status: "error", error: String(e) };
      }
      setFiles([...updated]);
    }
    setIsProcessing(false);
  };

  const downloadSingle = (item: ImageFile) => {
    if (!item.outputBlob) return;
    const ext = FORMAT_EXT[settings.format];
    const baseName = item.file.name.replace(/\.[^.]+$/, "");
    const a = document.createElement("a");
    const url = URL.createObjectURL(item.outputBlob);
    a.href = url;
    a.download = `${baseName}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadAll = async () => {
    const done = files.filter((f) => f.status === "done" && f.outputBlob);
    if (done.length === 0) return;

    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const ext = FORMAT_EXT[settings.format];
    done.forEach((item) => {
      const baseName = item.file.name.replace(/\.[^.]+$/, "");
      zip.file(`${baseName}.${ext}`, item.outputBlob!);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted_images.zip";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const availableFormats: OutputFormat[] = [
    "image/jpeg",
    "image/png",
    "image/webp",
    ...(avifSupported === true ? (["image/avif"] as OutputFormat[]) : []),
  ];

  const doneCount = files.filter((f) => f.status === "done").length;
  const hasResults = doneCount > 0;

  return (
    <>
      {/* ページ冒頭: このツールについて + 個人情報保護 */}
      <div className="mb-6 flex flex-wrap gap-2">
        <IntroToggle
          buttonLabel="このツールについて"
          simpleText={DESCRIPTIONS.intro.simple}
          technicalText={DESCRIPTIONS.intro.technical}
        />
        <IntroToggle
          buttonLabel="個人情報保護について"
          simpleText={DESCRIPTIONS.privacy.simple}
          technicalText={DESCRIPTIONS.privacy.technical}
          variant="privacy"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* ---- sidebar ---- */}
        <aside className="space-y-5">
          {/* format */}
          <section className="bg-white/5 rounded-xl p-4">
            <UsageToggle
              label="出力形式"
              simpleText={DESCRIPTIONS.outputFormat.simple}
              technicalText={DESCRIPTIONS.outputFormat.technical}
            >
              <div className="grid grid-cols-2 gap-2">
                {availableFormats.map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setSettings((s) => ({ ...s, format: fmt }))}
                    className={`py-2 rounded-lg text-sm font-mono transition-all ${
                      settings.format === fmt
                        ? "bg-sky-500 text-white"
                        : "bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    {FORMAT_EXT[fmt].toUpperCase()}
                  </button>
                ))}
              </div>
              {avifSupported === false && (
                <p className="text-xs text-white/30">※ このブラウザは AVIF エンコード非対応</p>
              )}
            </UsageToggle>
          </section>

          {/* quality */}
          {settings.format !== "image/png" && (
            <section className="bg-white/5 rounded-xl p-4">
              <UsageToggle
                label="画質"
                simpleText={DESCRIPTIONS.quality.simple}
                technicalText={DESCRIPTIONS.quality.technical}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={settings.quality}
                    onChange={(e) => setSettings((s) => ({ ...s, quality: +e.target.value }))}
                    className="flex-1 accent-sky-400"
                  />
                  <span className="text-sky-400 font-mono text-sm w-8 text-right">
                    {settings.quality}
                  </span>
                </div>
              </UsageToggle>
            </section>
          )}

          {/* bg color for jpeg */}
          {settings.format === "image/jpeg" && (
            <section className="bg-white/5 rounded-xl p-4">
              <UsageToggle
                label="透過→背景色"
                simpleText={DESCRIPTIONS.bgColor.simple}
                technicalText={DESCRIPTIONS.bgColor.technical}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.bgColor}
                    onChange={(e) => setSettings((s) => ({ ...s, bgColor: e.target.value }))}
                    className="w-10 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-sm text-white/50">{settings.bgColor}</span>
                </div>
              </UsageToggle>
            </section>
          )}

          {/* resize */}
          <section className="bg-white/5 rounded-xl p-4">
            <UsageToggle
              label="リサイズ"
              simpleText={DESCRIPTIONS.resize.simple}
              technicalText={DESCRIPTIONS.resize.technical}
            >
              <div className="flex items-center justify-end">
                <button
                  onClick={() => setSettings((s) => ({ ...s, resizeEnabled: !s.resizeEnabled }))}
                  aria-label={settings.resizeEnabled ? "リサイズをOFF" : "リサイズをON"}
                  className={`w-10 h-5 rounded-full transition-all relative ${
                    settings.resizeEnabled ? "bg-sky-500" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      settings.resizeEnabled ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
              {settings.resizeEnabled && (
                <div className="space-y-3 mt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-white/30 mb-1">幅 px</p>
                      <input
                        type="number"
                        placeholder="1200"
                        value={settings.width}
                        onChange={(e) => {
                          const newWidth = e.target.value;
                          setSettings((s) => {
                            const ar = calcAspectRatio(s, files);
                            const newWidthNum = Number(newWidth);
                            const newHeight =
                              ar && newWidthNum > 0
                                ? String(Math.round(newWidthNum / ar))
                                : s.height;
                            return { ...s, width: newWidth, height: newHeight, preset: "" };
                          });
                        }}
                        className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-white/30 mb-1">高さ px</p>
                      <input
                        type="number"
                        placeholder="800"
                        value={settings.height}
                        onChange={(e) => {
                          const newHeight = e.target.value;
                          setSettings((s) => {
                            const ar = calcAspectRatio(s, files);
                            const newHeightNum = Number(newHeight);
                            const newWidth =
                              ar && newHeightNum > 0
                                ? String(Math.round(newHeightNum * ar))
                                : s.width;
                            return { ...s, width: newWidth, height: newHeight, preset: "" };
                          });
                        }}
                        className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-white/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.keepAspect}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, keepAspect: e.target.checked }))
                      }
                      className="accent-sky-400"
                    />
                    アスペクト比を維持
                  </label>
                  <div>
                    <UsageToggle
                      label="プリセット"
                      labelClassName="text-xs text-white/30"
                      simpleText={DESCRIPTIONS.preset.simple}
                      technicalText={DESCRIPTIONS.preset.technical}
                    >
                      <div className="grid grid-cols-1 gap-1">
                        {PRESETS.map((p) => (
                          <button
                            key={p.label}
                            onClick={() => applyPreset(p)}
                            className={`text-left px-3 py-1.5 rounded-lg text-xs transition-all ${
                              settings.preset === p.label
                                ? "bg-sky-500/20 text-sky-400"
                                : "hover:bg-white/10 text-white/40"
                            }`}
                          >
                            {p.label} — {p.width}×{p.height}
                          </button>
                        ))}
                      </div>
                    </UsageToggle>
                  </div>
                </div>
              )}
            </UsageToggle>
          </section>

          {/* adjustments */}
          <section className="bg-white/5 rounded-xl p-4">
            <UsageToggle
              label="調整"
              simpleText={DESCRIPTIONS.adjust.simple}
              technicalText={DESCRIPTIONS.adjust.technical}
            >
              {(["brightness", "contrast", "saturation"] as const).map((key) => {
                const labels = { brightness: "明るさ", contrast: "コントラスト", saturation: "彩度" };
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs text-white/30 mb-1">
                      <span>{labels[key]}</span>
                      <span className="font-mono text-sky-400">
                        {settings[key] > 0 ? "+" : ""}
                        {settings[key]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={settings[key]}
                      onChange={(e) => setSettings((s) => ({ ...s, [key]: +e.target.value }))}
                      className="w-full accent-sky-400"
                    />
                  </div>
                );
              })}
              <button
                onClick={() =>
                  setSettings((s) => ({ ...s, brightness: 0, contrast: 0, saturation: 0 }))
                }
                className="text-xs text-white/20 hover:text-white/40 transition-colors"
              >
                リセット
              </button>
            </UsageToggle>
          </section>
        </aside>

        {/* ---- main area ---- */}
        <div className="space-y-4">
          <p className="text-xs text-white/30 text-right">ブラウザ内処理 · サーバー送信なし</p>

          {/* dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
            }}
            aria-label="画像をドロップ、またはクリックして選択"
            className={`min-h-[240px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all px-6 py-8 ${
              isDragging
                ? "border-sky-400 bg-sky-400/10"
                : "border-white/30 hover:border-white/50 hover:bg-white/5"
            }`}
          >
            <div className="text-7xl mb-4">🖼️</div>
            <p className="text-base text-white/90 font-medium mb-2 text-center">
              画像をドロップ、またはクリックして選択
            </p>
            <p className="text-sm text-white/70 text-center leading-relaxed">
              一度に何枚でも選べます<br />
              対応形式: PNG / JPEG / WebP / AVIF
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>
          {/* file list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/40">{files.length} ファイル</p>
                <button
                  onClick={() => {
                    setFiles((prev) => {
                      prev.forEach((item) => {
                        URL.revokeObjectURL(item.previewBefore);
                        if (item.previewAfter) URL.revokeObjectURL(item.previewAfter);
                      });
                      return [];
                    });
                  }}
                  className="text-xs text-white/20 hover:text-white/40 transition-colors"
                >
                  すべて削除
                </button>
              </div>

              {files.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/5 rounded-xl p-3 flex items-center gap-3"
                >
                  <img
                    src={item.previewBefore}
                    alt=""
                    className="w-12 h-12 object-cover rounded-lg flex-shrink-0 cursor-pointer"
                    onClick={() => setSelectedPreview(item.previewBefore)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.file.name}</p>
                    <p className="text-xs text-white/30">
                      {formatBytes(item.file.size)}
                      {item.outputSize !== undefined && (
                        <span className="ml-2 text-sky-400">→ {formatBytes(item.outputSize)}</span>
                      )}
                    </p>
                    {item.status === "error" && (
                      <p className="text-xs text-red-400 mt-0.5">{item.error}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {item.status === "waiting" && (
                      <span className="text-xs text-white/20">待機中</span>
                    )}
                    {item.status === "processing" && (
                      <span className="text-xs text-amber-400 animate-pulse">変換中...</span>
                    )}
                    {item.status === "done" && item.previewAfter && (
                      <>
                        <img
                          src={item.previewAfter}
                          alt=""
                          className="w-12 h-12 object-cover rounded-lg cursor-pointer"
                          onClick={() =>
                            item.previewAfter && setSelectedPreview(item.previewAfter)
                          }
                        />
                        <button
                          onClick={() => downloadSingle(item)}
                          className="text-xs bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 px-3 py-1 rounded-lg transition-all"
                        >
                          DL
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => removeFile(item.id)}
                      aria-label="削除"
                      className="text-white/20 hover:text-white/50 text-lg leading-none ml-1"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* actions */}
          {files.length > 0 && (
            <div className="flex gap-3">
              <button
                onClick={processAll}
                disabled={isProcessing}
                className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all"
              >
                {isProcessing ? "変換中..." : `${files.length} 枚を一括変換`}
              </button>
              {hasResults && (
                <button
                  onClick={downloadAll}
                  className="bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-xl transition-all text-sm"
                >
                  ZIP で一括DL
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* footer */}
      <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-between">
        <Link
          href="/tools"
          className="text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          ← Tools一覧へ戻る
        </Link>
        <p className="text-xs text-white/30">© 2026 NoviqLab</p>
      </div>

      {/* preview modal */}
      {selectedPreview && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPreview(null)}
        >
          <img
            src={selectedPreview}
            alt=""
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white/50 hover:text-white text-2xl"
            onClick={() => setSelectedPreview(null)}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
