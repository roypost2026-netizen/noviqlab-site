"use client";

import { useEffect, useState } from "react";
import type {
  Profile,
  Variant,
  OutputFormat,
  AspectRatioPreset,
  CropPosition,
} from "./types";
import { resolveAspectRatioValue } from "./imageProcessor";
import UsageToggle from "./UsageToggle";
import { DESCRIPTIONS } from "./descriptions";

interface ProfileEditorProps {
  profile: Profile | null;
  isOpen: boolean;
  onSave: (profile: Profile) => void;
  onClose: () => void;
  avifSupported: boolean;
}

const ASPECT_PRESETS: { label: string; value: AspectRatioPreset }[] = [
  { label: "16:9", value: "16:9" },
  { label: "3:2", value: "3:2" },
  { label: "4:3", value: "4:3" },
  { label: "1:1", value: "1:1" },
  { label: "カスタム", value: "custom" },
];

const FORMAT_OPTIONS: { label: string; value: OutputFormat }[] = [
  { label: "JPEG", value: "image/jpeg" },
  { label: "PNG", value: "image/png" },
  { label: "WebP", value: "image/webp" },
  { label: "AVIF", value: "image/avif" },
];

function genId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function makeDefaultVariant(): Variant {
  return {
    id: genId(),
    name: "バリアント",
    width: 1200,
    height: 800,
    maxBytes: undefined,
    suffix: "",
  };
}

function makeDefaultProfile(): Omit<Profile, "id"> {
  return {
    name: "",
    baseFilename: "",
    aspectRatio: { type: "preset", value: "16:9" },
    cropPosition: "center",
    format: "image/jpeg",
    convertToSrgb: true,
    stripMetadata: true,
    variants: [makeDefaultVariant()],
  };
}

export default function ProfileEditor({
  profile,
  isOpen,
  onSave,
  onClose,
  avifSupported,
}: ProfileEditorProps) {
  const [draft, setDraft] = useState<Omit<Profile, "id">>(makeDefaultProfile());
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDraft(profile ? { ...profile, variants: profile.variants.map((v) => ({ ...v })) } : makeDefaultProfile());
      setErrors([]);
    }
  }, [isOpen, profile]);

  // Esc で閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const updateVariant = (id: string, patch: Partial<Variant>) => {
    setDraft((d) => ({
      ...d,
      variants: d.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    }));
  };

  const removeVariant = (id: string) => {
    setDraft((d) => ({ ...d, variants: d.variants.filter((v) => v.id !== id) }));
  };

  const addVariant = () => {
    setDraft((d) => ({ ...d, variants: [...d.variants, makeDefaultVariant()] }));
  };

  const handleSave = () => {
    const errs: string[] = [];
    if (!draft.name.trim()) errs.push("プロファイル名は必須です");
    if (!draft.baseFilename.trim()) errs.push("ベースファイル名は必須です");
    if (draft.variants.length === 0) errs.push("バリアントを1つ以上追加してください");
    draft.variants.forEach((v, i) => {
      if (!v.width || !v.height) errs.push(`バリアント${i + 1}: サイズを入力してください`);
    });
    if (errs.length > 0) { setErrors(errs); return; }

    onSave({
      ...draft,
      id: profile?.id ?? genId(),
      name: draft.name.trim(),
      baseFilename: draft.baseFilename.trim(),
    });
  };

  const formats = avifSupported
    ? FORMAT_OPTIONS
    : FORMAT_OPTIONS.filter((f) => f.value !== "image/avif");

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0b1120] border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-5">
          {profile ? "プロファイル編集" : "プロファイル新規作成"}
        </h2>

        <div className="space-y-4">
          {/* 名前 */}
          <div>
            <label className="text-xs text-white/40 uppercase tracking-widest block mb-1">
              プロファイル名
            </label>
            <input
              type="text"
              placeholder="hero"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>

          {/* ベースファイル名 */}
          <div>
            <label className="text-xs text-white/40 uppercase tracking-widest block mb-1">
              ベースファイル名
            </label>
            <input
              type="text"
              placeholder="hero-a"
              value={draft.baseFilename}
              onChange={(e) => setDraft((d) => ({ ...d, baseFilename: e.target.value }))}
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>

          {/* 比率 */}
          <div>
            <label className="text-xs text-white/40 uppercase tracking-widest block mb-1">
              比率
            </label>
            <select
              value={draft.aspectRatio.value}
              onChange={(e) => {
                const val = e.target.value as AspectRatioPreset;
                if (val !== "custom") {
                  const newAR = { type: "preset" as const, value: val };
                  const targetAR = resolveAspectRatioValue(newAR);
                  setDraft((d) => ({
                    ...d,
                    aspectRatio: newAR,
                    variants: d.variants.map((v) =>
                      v.width ? { ...v, height: Math.round(v.width / targetAR) } : v
                    ),
                  }));
                } else {
                  setDraft((d) => ({ ...d, aspectRatio: { type: "custom", value: val } }));
                }
              }}
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-sky-400"
            >
              {ASPECT_PRESETS.map((ap) => (
                <option key={ap.value} value={ap.value} className="bg-[#0b1120]">
                  {ap.label}
                </option>
              ))}
            </select>
            {draft.aspectRatio.value === "custom" && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  type="number"
                  placeholder="幅 (例: 16)"
                  value={draft.aspectRatio.customWidth ?? ""}
                  onChange={(e) => {
                    const customWidth = +e.target.value;
                    setDraft((d) => {
                      const newAR = { ...d.aspectRatio, customWidth };
                      const targetAR = newAR.customWidth && newAR.customHeight ? newAR.customWidth / newAR.customHeight : 0;
                      return {
                        ...d,
                        aspectRatio: newAR,
                        ...(targetAR > 0 ? { variants: d.variants.map((v) => v.width ? { ...v, height: Math.round(v.width / targetAR) } : v) } : {}),
                      };
                    });
                  }}
                  className="bg-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-sky-400"
                />
                <input
                  type="number"
                  placeholder="高さ (例: 9)"
                  value={draft.aspectRatio.customHeight ?? ""}
                  onChange={(e) => {
                    const customHeight = +e.target.value;
                    setDraft((d) => {
                      const newAR = { ...d.aspectRatio, customHeight };
                      const targetAR = newAR.customWidth && newAR.customHeight ? newAR.customWidth / newAR.customHeight : 0;
                      return {
                        ...d,
                        aspectRatio: newAR,
                        ...(targetAR > 0 ? { variants: d.variants.map((v) => v.width ? { ...v, height: Math.round(v.width / targetAR) } : v) } : {}),
                      };
                    });
                  }}
                  className="bg-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-sky-400"
                />
              </div>
            )}
          </div>

          {/* クロップ位置 */}
          <div>
            <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">
              クロップ位置
            </label>
            <div className="flex gap-4">
              {(["center", "top", "bottom"] as CropPosition[]).map((pos) => {
                const label = { center: "中央", top: "上", bottom: "下" }[pos];
                return (
                  <label key={pos} className="flex items-center gap-1.5 text-sm text-white/60 cursor-pointer">
                    <input
                      type="radio"
                      name="cropPosition"
                      value={pos}
                      checked={draft.cropPosition === pos}
                      onChange={() => setDraft((d) => ({ ...d, cropPosition: pos }))}
                      className="accent-sky-400"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* 出力形式 */}
          <div>
            <label className="text-xs text-white/40 uppercase tracking-widest block mb-1">
              出力形式
            </label>
            <select
              value={draft.format}
              onChange={(e) => setDraft((d) => ({ ...d, format: e.target.value as OutputFormat }))}
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-sky-400"
            >
              {formats.map((f) => (
                <option key={f.value} value={f.value} className="bg-[#0b1120]">
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* オプション */}
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-xs text-white/40 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.convertToSrgb}
                onChange={(e) => setDraft((d) => ({ ...d, convertToSrgb: e.target.checked }))}
                className="accent-sky-400"
              />
              sRGBに変換
            </label>
            <label className="flex items-center gap-1.5 text-xs text-white/40 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.stripMetadata}
                onChange={(e) => setDraft((d) => ({ ...d, stripMetadata: e.target.checked }))}
                className="accent-sky-400"
              />
              メタデータ削除
            </label>
          </div>

          {/* バリアント */}
          <UsageToggle
            label="バリアント"
            simpleText={DESCRIPTIONS.batch.variant.simple}
            technicalText={DESCRIPTIONS.batch.variant.technical}
          >
            <div className="space-y-3">
              {draft.variants.map((v, i) => (
                <div key={v.id} className="bg-white/5 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60 font-mono">
                      {v.name || `バリアント${i + 1}`} —{" "}
                      {v.width && v.height ? `${v.width}×${v.height}px` : "サイズ未設定"}
                      {(v.minBytes || v.maxBytes) ? ` / ${v.minBytes ? Math.round(v.minBytes / 1024) : "?"}–${v.maxBytes ? Math.round(v.maxBytes / 1024) : "?"}KB` : ""}
                    </span>
                    <button
                      onClick={() => removeVariant(v.id)}
                      className="text-xs text-white/20 hover:text-red-400 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-white/30 mb-1">バリアント名</p>
                      <input
                        type="text"
                        placeholder="@2x"
                        value={v.name}
                        onChange={(e) => updateVariant(v.id, { name: e.target.value })}
                        className="w-full bg-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-white/30 mb-1">サフィックス</p>
                      <input
                        type="text"
                        placeholder="@2x（空でも可）"
                        value={v.suffix}
                        onChange={(e) => updateVariant(v.id, { suffix: e.target.value })}
                        className="w-full bg-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-white/30 mb-1">幅 px</p>
                      <input
                        type="number"
                        placeholder="1600"
                        value={v.width || ""}
                        onChange={(e) => {
                          const newWidth = +e.target.value;
                          const ar = draft.aspectRatio;
                          const validAR = ar.type === "preset"
                            ? resolveAspectRatioValue(ar)
                            : (ar.customWidth && ar.customHeight ? ar.customWidth / ar.customHeight : 0);
                          updateVariant(v.id, {
                            width: newWidth,
                            ...(validAR > 0 && newWidth ? { height: Math.round(newWidth / validAR) } : {}),
                          });
                        }}
                        className="w-full bg-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-white/30 mb-1">高さ px</p>
                      <input
                        type="number"
                        placeholder="900"
                        value={v.height || ""}
                        onChange={(e) => updateVariant(v.id, { height: +e.target.value })}
                        className="w-full bg-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-white/30 mb-1">容量下限 KB（空欄 = なし）</p>
                      <input
                        type="number"
                        placeholder="200"
                        value={v.minBytes !== undefined ? Math.round(v.minBytes / 1024) : ""}
                        onChange={(e) =>
                          updateVariant(v.id, {
                            minBytes: e.target.value ? +e.target.value * 1024 : undefined,
                          })
                        }
                        className="w-full bg-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-white/30 mb-1">容量上限 KB（空欄 = なし）</p>
                      <input
                        type="number"
                        placeholder="300"
                        value={v.maxBytes !== undefined ? Math.round(v.maxBytes / 1024) : ""}
                        onChange={(e) =>
                          updateVariant(v.id, {
                            maxBytes: e.target.value ? +e.target.value * 1024 : undefined,
                          })
                        }
                        className="w-full bg-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>
                    {v.width > 0 && v.height > 0 && (() => {
                      const ar = draft.aspectRatio;
                      const validAR = ar.type === "preset"
                        ? resolveAspectRatioValue(ar)
                        : (ar.customWidth && ar.customHeight ? ar.customWidth / ar.customHeight : 0);
                      if (!validAR) return null;
                      const expectedH = Math.round(v.width / validAR);
                      return Math.abs(v.height - expectedH) > 1 ? (
                        <p className="col-span-2 text-xs text-amber-400">
                          ⚠️ 高さが比率と一致していません（期待値: {expectedH}px）
                        </p>
                      ) : null;
                    })()}
                    {v.minBytes && v.maxBytes && v.minBytes > v.maxBytes && (
                      <p className="col-span-2 text-xs text-red-400">下限が上限を超えています</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addVariant}
              className="mt-2 w-full py-2 rounded-lg text-xs text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 transition-all"
            >
              + バリアント追加
            </button>
          </UsageToggle>

          {/* エラー */}
          {errors.length > 0 && (
            <div className="bg-red-500/10 rounded-lg p-3 space-y-1">
              {errors.map((e, i) => (
                <p key={i} className="text-xs text-red-400">{e}</p>
              ))}
            </div>
          )}
        </div>

        {/* フッターボタン */}
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 transition-all"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-sky-500 hover:bg-sky-400 transition-all"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
