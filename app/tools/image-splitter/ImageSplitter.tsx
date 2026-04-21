"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ImageFile, SplitSettings, SplitResult, SplitPosition, OutputFormat } from "./types";
import { calcSplitPositions, splitImage } from "./splitLogic";

const ACCEPTED_FORMATS = "image/png,image/jpeg,image/webp";

export default function ImageSplitter() {
  const [imageFile, setImageFile] = useState<ImageFile | null>(null);
  const [settings, setSettings] = useState<SplitSettings>({
    mode: "fixed",
    fixedHeight: 1000,
    smartSplit: true,
  });
  const [splitPositions, setSplitPositions] = useState<SplitPosition[]>([]);
  const [results, setResults] = useState<SplitResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImage = useCallback((file: File) => {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      alert("対応形式: PNG / JPEG / WebP");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImageFile({
        id: crypto.randomUUID(),
        file,
        objectUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: file.type as OutputFormat,
      });
      setResults([]);
    };
    img.onerror = () => {
      alert("画像の読み込みに失敗しました");
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) loadImage(file);
    },
    [loadImage]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadImage(file);
    },
    [loadImage]
  );

  const handleRemove = useCallback(() => {
    if (imageFile?.objectUrl) URL.revokeObjectURL(imageFile.objectUrl);
    results.forEach((r) => URL.revokeObjectURL(r.url));
    setImageFile(null);
    setResults([]);
    setSplitPositions([]);
  }, [imageFile, results]);

  useEffect(() => {
    return () => {
      if (imageFile?.objectUrl) URL.revokeObjectURL(imageFile.objectUrl);
      results.forEach((r) => URL.revokeObjectURL(r.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setSplitPositions([]);
      return;
    }
    const positions = calcSplitPositions(imageFile, settings);
    setSplitPositions(positions);
  }, [imageFile, settings]);

  const handleSplit = useCallback(async () => {
    if (!imageFile) return;
    setProcessing(true);
    try {
      const splitResults = await splitImage(imageFile, splitPositions);
      results.forEach((r) => URL.revokeObjectURL(r.url));
      setResults(splitResults);
    } catch (err) {
      console.error(err);
      alert("分割処理中にエラーが発生しました");
    } finally {
      setProcessing(false);
    }
  }, [imageFile, splitPositions, results]);

  return (
    <div className="mt-8 flex flex-col lg:flex-row gap-6">
      {/* サイドバー */}
      <aside className="w-full lg:w-[360px] space-y-6 shrink-0">
        {/* 分割モード */}
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest mb-2">分割モード</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={settings.mode === "fixed"}
                onChange={() => setSettings((s) => ({ ...s, mode: "fixed" }))}
                className="accent-sky-400"
              />
              <span className="text-sm text-white/85">高さピクセル指定</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={settings.mode === "a4"}
                onChange={() => setSettings((s) => ({ ...s, mode: "a4" }))}
                className="accent-sky-400"
              />
              <span className="text-sm text-white/85">A4印刷用</span>
            </label>
          </div>
        </div>

        {/* 高さ px（fixed時のみ） */}
        {settings.mode === "fixed" && (
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-2">高さ px</p>
            <input
              type="number"
              min={100}
              value={settings.fixedHeight}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  fixedHeight: Number(e.target.value) || 1000,
                }))
              }
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>
        )}

        {/* A4モードの説明 */}
        {settings.mode === "a4" && imageFile && (
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/60 leading-relaxed">
              幅 {imageFile.width}px から、A4比率（1:√2）で
              <br />
              高さ {Math.round(imageFile.width * Math.SQRT2)}px ごとに分割します。
            </p>
          </div>
        )}

        {/* スマート分割トグル */}
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest mb-2">スマート分割</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.smartSplit}
              onChange={(e) =>
                setSettings((s) => ({ ...s, smartSplit: e.target.checked }))
              }
              className="accent-sky-400"
              disabled
            />
            <span className="text-sm text-white/50">
              余白行を検出して切る（Day 2 実装予定）
            </span>
          </label>
        </div>

        {/* 分割予定情報 */}
        {imageFile && splitPositions.length > 0 && (
          <div className="bg-sky-500/10 border border-sky-400/20 rounded-lg p-3">
            <p className="text-xs text-sky-300 leading-relaxed">
              分割予定: <strong>{splitPositions.length + 1} ピース</strong>
              <br />
              元画像: {imageFile.width} × {imageFile.height} px
            </p>
          </div>
        )}
      </aside>

      {/* メインエリア */}
      <section className="flex-1 min-w-0">
        {!imageFile ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-sky-400 bg-sky-500/10"
                : "border-white/20 hover:border-white/40 bg-white/5"
            }`}
          >
            <div className="text-6xl mb-4">🖼</div>
            <p className="text-white/85 font-semibold mb-2">
              画像をドロップ、またはクリックして選択
            </p>
            <p className="text-xs text-white/50">対応形式: PNG / JPEG / WebP</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FORMATS}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* ファイル情報ヘッダー */}
            <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
              <div>
                <p className="text-sm text-white/85 truncate">{imageFile.file.name}</p>
                <p className="text-xs text-white/50">
                  {imageFile.width} × {imageFile.height} px ·{" "}
                  {(imageFile.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={handleRemove}
                className="text-xs text-white/50 hover:text-red-400 transition-colors"
              >
                削除
              </button>
            </div>

            {/* プレビュー */}
            <div className="bg-white/5 rounded-xl p-4 overflow-auto max-h-[60vh]">
              <div className="relative inline-block">
                <img
                  src={imageFile.objectUrl}
                  alt="preview"
                  className="block max-w-full"
                  style={{ maxHeight: "unset" }}
                />
                {splitPositions.map((pos, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t-2 border-red-500 pointer-events-none"
                    style={{
                      top: `${(pos.y / imageFile.height) * 100}%`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* 分割実行ボタン */}
            <button
              onClick={handleSplit}
              disabled={processing || splitPositions.length === 0}
              className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-white/10 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {processing
                ? "処理中..."
                : splitPositions.length === 0
                ? "分割不要（画像サイズが十分小さい）"
                : `${splitPositions.length + 1} ピースに分割`}
            </button>

            {/* 分割結果 */}
            {results.length > 0 && (
              <div className="space-y-2 bg-white/5 rounded-xl p-4">
                <h3 className="text-xs text-white/40 uppercase tracking-widest mb-3">
                  分割結果 ({results.length} ファイル)
                </h3>
                {results.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white/85 truncate">{r.filename}</p>
                      <p className="text-xs text-white/50">
                        {r.width} × {r.height} px · {(r.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <a
                      href={r.url}
                      download={r.filename}
                      className="ml-3 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                    >
                      DL
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
