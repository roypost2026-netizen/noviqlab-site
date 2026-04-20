"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

type OutputFormat = "image/jpeg" | "image/png" | "image/webp" | "image/avif";
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

// 8.3: AVIF エンコード対応検出
async function detectAvifSupport(): Promise<boolean> {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob?.type === "image/avif"), "image/avif");
  });
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
    img.onload = () => {
      // 8.4: img.onerror 内の revoke は onerror 側に移動済み
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

        // step-down resize for quality
        let canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        // 8.6: non-null assertion を null チェックに置換
        const ctx0 = canvas.getContext("2d");
        if (!ctx0) {
          URL.revokeObjectURL(url);
          return reject(new Error("Canvas 2D context の取得に失敗しました"));
        }
        ctx0.drawImage(img, 0, 0);

        // 8.2: && → || に修正（横長・縦長画像で段階縮小が効かないバグ修正）
        while (canvas.width / 2 > targetW || canvas.height / 2 > targetH) {
          const tmp = document.createElement("canvas");
          tmp.width = Math.max(1, Math.floor(canvas.width / 2));
          tmp.height = Math.max(1, Math.floor(canvas.height / 2));
          const tmpCtx = tmp.getContext("2d");
          if (!tmpCtx) break;
          tmpCtx.drawImage(canvas, 0, 0, tmp.width, tmp.height);
          canvas = tmp;
        }

        const final = document.createElement("canvas");
        final.width = targetW;
        final.height = targetH;
        const ctx = final.getContext("2d");
        // 8.6: non-null assertion を null チェックに置換
        if (!ctx) {
          URL.revokeObjectURL(url);
          return reject(new Error("Canvas 2D context の取得に失敗しました"));
        }

        // background for JPEG
        if (settings.format === "image/jpeg") {
          ctx.fillStyle = settings.bgColor || "#ffffff";
          ctx.fillRect(0, 0, targetW, targetH);
        }

        const b = settings.brightness;
        const c = settings.contrast;
        const s = settings.saturation;
        ctx.filter = `brightness(${1 + b / 100}) contrast(${1 + c / 100}) saturate(${1 + s / 100})`;

        ctx.drawImage(canvas, 0, 0, targetW, targetH);
        URL.revokeObjectURL(url);

        const quality =
          settings.format === "image/png" ? undefined : settings.quality / 100;
        final.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("変換失敗"));
            const previewUrl = URL.createObjectURL(blob);
            resolve({ blob, previewUrl });
          },
          settings.format,
          quality
        );
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
  // 8.3: AVIF 対応フラグ
  const [avifSupported, setAvifSupported] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 8.3: マウント時に AVIF 対応検出
  // 8.4: アンマウント時に全 Object URL を revoke
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

  // Esc キーでモーダルを閉じる（要件 4.6）
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
    // ダウンロード後に revoke（遅延して確実に処理後）
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadAll = async () => {
    const done = files.filter((f) => f.status === "done" && f.outputBlob);
    if (done.length === 0) return;

    // 8.1: CDN dynamic import を npm パッケージに変更
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

  // 8.3: AVIF 非対応時は選択肢から除外
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
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* ---- sidebar ---- */}
        <aside className="space-y-5">
          {/* format */}
          <section className="bg-white/5 rounded-xl p-4 space-y-3">
            <p className="text-xs text-white/40 uppercase tracking-widest">出力形式</p>
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
              <p className="text-xs text-white/30">
                ※ このブラウザは AVIF エンコード非対応
              </p>
            )}
          </section>

          {/* quality */}
          {settings.format !== "image/png" && (
            <section className="bg-white/5 rounded-xl p-4 space-y-3">
              <p className="text-xs text-white/40 uppercase tracking-widest">画質</p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={settings.quality}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, quality: +e.target.value }))
                  }
                  className="flex-1 accent-sky-400"
                />
                <span className="text-sky-400 font-mono text-sm w-8 text-right">
                  {settings.quality}
                </span>
              </div>
            </section>
          )}

          {/* bg color for jpeg */}
          {settings.format === "image/jpeg" && (
            <section className="bg-white/5 rounded-xl p-4 space-y-3">
              <p className="text-xs text-white/40 uppercase tracking-widest">透過→背景色</p>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.bgColor}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, bgColor: e.target.value }))
                  }
                  className="w-10 h-8 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="font-mono text-sm text-white/50">{settings.bgColor}</span>
              </div>
            </section>
          )}

          {/* resize */}
          <section className="bg-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/40 uppercase tracking-widest">リサイズ</p>
              <button
                onClick={() =>
                  setSettings((s) => ({ ...s, resizeEnabled: !s.resizeEnabled }))
                }
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
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-white/30 mb-1">幅 px</p>
                    <input
                      type="number"
                      placeholder="1200"
                      value={settings.width}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          width: e.target.value,
                          preset: "",
                        }))
                      }
                      className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-sky-400"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-white/30 mb-1">高さ px</p>
                    <input
                      type="number"
                      placeholder="800"
                      value={settings.height}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          height: e.target.value,
                          preset: "",
                        }))
                      }
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
                  <p className="text-xs text-white/30 mb-2">プリセット</p>
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
                </div>
              </div>
            )}
          </section>

          {/* adjustments */}
          <section className="bg-white/5 rounded-xl p-4 space-y-3">
            <p className="text-xs text-white/40 uppercase tracking-widest">調整</p>
            {(["brightness", "contrast", "saturation"] as const).map((key) => {
              const labels = {
                brightness: "明るさ",
                contrast: "コントラスト",
                saturation: "彩度",
              };
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
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, [key]: +e.target.value }))
                    }
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
          </section>
        </aside>

        {/* ---- main area ---- */}
        <div className="space-y-4">
          {/* privacy notice */}
          <p className="text-xs text-white/30 text-right">
            ブラウザ内処理 · サーバー送信なし
          </p>

          {/* dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
            }}
            aria-label="画像をドロップ、またはクリックして選択"
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-sky-400 bg-sky-400/5"
                : "border-white/10 hover:border-white/20 hover:bg-white/5"
            }`}
          >
            <div className="text-4xl mb-3">🖼️</div>
            <p className="text-white/50 text-sm">画像をドロップ、またはクリックして選択</p>
            <p className="text-white/20 text-xs mt-1">PNG・JPEG・WebP・AVIF など対応</p>
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
                    // 8.4: すべて削除時に全 URL を revoke
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
                  {/* thumb before */}
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
                        <span className="ml-2 text-sky-400">
                          → {formatBytes(item.outputSize)}
                        </span>
                      )}
                    </p>
                    {item.status === "error" && (
                      <p className="text-xs text-red-400 mt-0.5">{item.error}</p>
                    )}
                  </div>

                  {/* status */}
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
