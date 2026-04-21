"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  Profile,
  Variant,
  BatchProfileAssignment,
  AssignedImage,
  BatchVariantResult,
  BatchConfigJson,
  OutputFormat,
} from "./types";
import { migrateBatchConfig } from "./types";
import { processBatchImage, detectAvifSupport } from "./imageProcessor";
import { BUILTIN_PRESETS, instantiatePreset } from "./builtinPresets";
import ProfileEditor from "./ProfileEditor";
import InfoAccordion from "@/components/tools/common/InfoAccordion";
import IntroToggle from "@/components/tools/common/IntroToggle";
import { DESCRIPTIONS } from "./descriptions";

const FORMAT_EXT: Record<OutputFormat, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const STORAGE_KEY = "image-resizer-batch-profiles";
const SUFFIX_RE = /^[a-zA-Z0-9_-]*$/;
const MAX_IMAGES_PER_PROFILE = 50;

const PRESET_DEFAULT_NAMES = new Set(["content", "blog", "product", "ogp"]);

function isDefaultPresetName(profile: Profile): boolean {
  return PRESET_DEFAULT_NAMES.has(profile.name) && profile.name === profile.baseFilename;
}

function genId(): string {
  try { return crypto.randomUUID(); }
  catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildFilename(base: string, imageSuffix: string, variantSuffix: string, ext: string): string {
  return `${base}${imageSuffix}${variantSuffix}.${ext}`;
}

function formatRange(v: Variant): string {
  if (v.minBytes && v.maxBytes) return `${Math.round(v.minBytes / 1024)}–${Math.round(v.maxBytes / 1024)}KB`;
  if (v.maxBytes) return `上限${Math.round(v.maxBytes / 1024)}KB`;
  if (v.minBytes) return `下限${Math.round(v.minBytes / 1024)}KB`;
  return "";
}

function loadProfilesFromStorage(): Profile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Profile[];
  } catch { return []; }
}

function saveProfilesToStorage(profiles: Profile[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles)); }
  catch { /* プライベートブラウジング等 */ }
}

function makeEmptyAssignment(profileId: string): BatchProfileAssignment {
  return { profileId, images: [], status: "waiting" };
}

/** サフィックス重複チェック: 重複しているsuffixのセットを返す */
function findDuplicateSuffixes(images: AssignedImage[]): Set<string> {
  const seen = new Map<string, number>();
  images.forEach((img) => { seen.set(img.imageSuffix, (seen.get(img.imageSuffix) ?? 0) + 1); });
  const dups = new Set<string>();
  seen.forEach((count, suffix) => { if (count > 1) dups.add(suffix); });
  return dups;
}

export default function BatchMode() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<BatchProfileAssignment[]>([]);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [avifSupported, setAvifSupported] = useState(false);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [showPresetGuide, setShowPresetGuide] = useState(false);
  const [showProfileGuide, setShowProfileGuide] = useState(false);
  const [showJsonGuide, setShowJsonGuide] = useState(false);
  const [showAssignGuide, setShowAssignGuide] = useState(false);
  const multiFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    detectAvifSupport().then(setAvifSupported);
    if (!initialized.current) {
      initialized.current = true;
      const saved = loadProfilesFromStorage();
      if (saved.length > 0) {
        setProfiles(saved);
        setAssignments(saved.map((p) => makeEmptyAssignment(p.id)));
      }
    }
  }, []);

  // アンマウント時に Object URL を全 revoke
  useEffect(() => {
    return () => {
      setAssignments((prev) => {
        prev.forEach((a) => {
          a.images.forEach((img) => {
            if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
          });
        });
        return prev;
      });
    };
  }, []);

  const syncAssignments = (newProfiles: Profile[]) => {
    setAssignments((prev) => {
      const kept = new Map(prev.map((a) => [a.profileId, a]));
      return newProfiles.map((p) => kept.get(p.id) ?? makeEmptyAssignment(p.id));
    });
  };

  const updateProfiles = (newProfiles: Profile[]) => {
    setProfiles(newProfiles);
    saveProfilesToStorage(newProfiles);
    syncAssignments(newProfiles);
  };

  const handleSaveProfile = (profile: Profile) => {
    const exists = profiles.find((p) => p.id === profile.id);
    const newProfiles = exists
      ? profiles.map((p) => (p.id === profile.id ? profile : p))
      : [...profiles, profile];
    updateProfiles(newProfiles);
    setIsEditorOpen(false);
    setEditingProfile(null);
  };

  const handleDeleteProfile = (id: string) => {
    if (!confirm("このプロファイルを削除しますか？")) return;
    const a = assignments.find((a) => a.profileId === id);
    a?.images.forEach((img) => { if (img.previewUrl) URL.revokeObjectURL(img.previewUrl); });
    updateProfiles(profiles.filter((p) => p.id !== id));
  };

  const handleLoadPreset = (index: number) => {
    const newProfiles = instantiatePreset(index);
    updateProfiles([...profiles, ...newProfiles]);
    setShowPresetDropdown(false);
  };

  // -a, -b, ..., -z → -img1, -img2, ... の順で未使用 suffix を返す
  function findNextSuffix(used: Set<string>): string {
    for (let i = 0; i < 26; i++) {
      const candidate = `-${String.fromCharCode(97 + i)}`;
      if (!used.has(candidate)) return candidate;
    }
    let n = 1;
    while (used.has(`-img${n}`)) n++;
    return `-img${n}`;
  }

  // 複数画像を追加（suffix 自動割当）
  const handleAddImages = (profileId: string, files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;

    setAssignments((prev) => prev.map((a) => {
      if (a.profileId !== profileId) return a;
      const remaining = MAX_IMAGES_PER_PROFILE - a.images.length;
      const toAdd = arr.slice(0, remaining);

      const used = new Set(a.images.map((img) => img.imageSuffix));
      const newImages: AssignedImage[] = toAdd.map((file) => {
        const suffix = findNextSuffix(used);
        used.add(suffix);
        return {
          id: genId(),
          file,
          imageSuffix: suffix,
          previewUrl: URL.createObjectURL(file),
          status: "waiting",
        };
      });
      return { ...a, images: [...a.images, ...newImages], status: "waiting" };
    }));
  };

  // 画像のサフィックス更新
  const handleSuffixChange = (profileId: string, imageId: string, suffix: string) => {
    setAssignments((prev) => prev.map((a) => {
      if (a.profileId !== profileId) return a;
      return {
        ...a,
        images: a.images.map((img) =>
          img.id === imageId ? { ...img, imageSuffix: suffix } : img
        ),
      };
    }));
  };

  // 画像削除
  const handleRemoveImage = (profileId: string, imageId: string) => {
    setAssignments((prev) => prev.map((a) => {
      if (a.profileId !== profileId) return a;
      const img = a.images.find((i) => i.id === imageId);
      if (img?.previewUrl) URL.revokeObjectURL(img.previewUrl);
      return { ...a, images: a.images.filter((i) => i.id !== imageId) };
    }));
  };

  const processAll = async () => {
    const readyAssignments = assignments.filter((a) => a.images.length > 0);
    if (readyAssignments.length === 0) return;

    const total = readyAssignments.reduce((sum, a) => {
      const profile = profiles.find((p) => p.id === a.profileId);
      return sum + a.images.length * (profile?.variants.length ?? 0);
    }, 0);

    setIsProcessing(true);
    setProgress({ done: 0, total });
    let done = 0;

    for (const assignment of readyAssignments) {
      const profile = profiles.find((p) => p.id === assignment.profileId);
      if (!profile) continue;

      const updatedImages: AssignedImage[] = [...assignment.images];

      for (let imgIdx = 0; imgIdx < updatedImages.length; imgIdx++) {
        const image = updatedImages[imgIdx];
        const imageResults: BatchVariantResult[] = [];

        for (const variant of profile.variants) {
          await new Promise((r) => setTimeout(r, 0)); // UI 応答性維持

          const filename = buildFilename(
            profile.baseFilename,
            image.imageSuffix,
            variant.suffix,
            FORMAT_EXT[profile.format]
          );

          try {
            const { blob, warning } = await processBatchImage(image.file, profile, variant);
            imageResults.push({
              variantId: variant.id,
              imageSuffix: image.imageSuffix,
              filename,
              blob,
              actualBytes: blob.size,
              targetMinBytes: variant.minBytes,
              targetMaxBytes: variant.maxBytes,
              warning,
            });
          } catch (e) {
            imageResults.push({
              variantId: variant.id,
              imageSuffix: image.imageSuffix,
              filename,
              blob: new Blob(),
              actualBytes: 0,
              warning: `処理エラー: ${String(e)}`,
            });
          }

          done++;
          setProgress({ done, total });
        }

        updatedImages[imgIdx] = { ...image, results: imageResults, status: "done" };
        setAssignments((prev) => prev.map((a) =>
          a.profileId === assignment.profileId
            ? { ...a, images: updatedImages.map((img) => ({ ...img })), status: "done" }
            : a
        ));
      }
    }

    setIsProcessing(false);
  };

  const downloadAll = async () => {
    const allResults = assignments.flatMap((a) =>
      a.images.flatMap((img) => img.results ?? [])
    );
    if (allResults.length === 0) return;

    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const existingNames = new Set<string>();

    allResults.forEach((r) => {
      let name = r.filename;
      if (existingNames.has(name)) {
        const ext = name.split(".").pop() ?? "";
        const base = name.slice(0, -(ext.length + 1));
        let c = 2;
        while (existingNames.has(`${base}-${c}.${ext}`)) c++;
        name = `${base}-${c}.${ext}`;
      }
      existingNames.add(name);
      zip.file(name, r.blob);
    });

    const today = new Date().toISOString().split("T")[0];
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-output-${today}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportJson = () => {
    const config: BatchConfigJson = {
      version: "2.0",
      profiles,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().split("T")[0];
    a.download = `batch-config-${today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);
        const config = migrateBatchConfig(raw);
        updateProfiles(config.profiles);
      } catch (err) {
        alert(`JSONの読み込みに失敗しました: ${String(err)}`);
      }
    };
    reader.readAsText(file);
  };

  const hasResults = assignments.some((a) => a.images.some((img) => img.results && img.results.length > 0));
  const totalFileCount = assignments.reduce((sum, a) => {
    const profile = profiles.find((p) => p.id === a.profileId);
    return sum + a.images.length * (profile?.variants.length ?? 0);
  }, 0);
  const hasAnyImage = assignments.some((a) => a.images.length > 0);

  return (
    <>
      {/* ページ冒頭: このモードについて */}
      <div className="mb-6">
        <IntroToggle
          buttonLabel="このモードについて"
          simpleText={DESCRIPTIONS.batch.intro.simple}
          technicalText={DESCRIPTIONS.batch.intro.technical}
        />
      </div>

      {/* プロファイル管理セクション */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-mono text-white/40 uppercase tracking-widest">バッチプロファイル</h2>
            <button
              onClick={() => setShowProfileGuide(!showProfileGuide)}
              className="text-xs text-white/40 hover:text-sky-400 transition-colors flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5"
            >
              <span>{showProfileGuide ? "▲" : ""}</span>
              <span>プロファイルとは?</span>
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => { setEditingProfile(null); setIsEditorOpen(true); }}
              className="text-xs bg-sky-500 hover:bg-sky-400 text-white px-3 py-1.5 rounded-lg transition-all"
            >
              + プロファイル追加
            </button>
            <div className="relative">
              <button
                onClick={() => setShowPresetDropdown((v) => !v)}
                className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-all"
              >
                プリセット読み込み ▼
              </button>
              {showPresetDropdown && (
                <div className="absolute right-0 top-full mt-1 w-60 bg-[#0b1120] border border-white/10 rounded-xl z-20 overflow-hidden">
                  {BUILTIN_PRESETS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleLoadPreset(i)}
                      className="w-full text-left px-4 py-2.5 text-xs text-white/70 hover:bg-white/10 transition-colors"
                    >
                      <span className="block text-white/90">{p.presetName}</span>
                      <span className="text-white/40">{p.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowPresetGuide(!showPresetGuide)}
              className="text-xs text-white/40 hover:text-sky-400 transition-colors flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5"
            >
              <span>{showPresetGuide ? "▲" : ""}</span>
              <span>プリセットの選び方</span>
            </button>
          </div>
        </div>

        {showProfileGuide && (
          <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-white/10">
            <p className="text-sm text-white/85 leading-relaxed whitespace-pre-line">
              {DESCRIPTIONS.batch.profile.simple}
            </p>
            <InfoAccordion>
              <p className="whitespace-pre-line">{DESCRIPTIONS.batch.profile.technical}</p>
            </InfoAccordion>
          </div>
        )}

        {showPresetGuide && (
          <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-white/10">
            <p className="text-sm text-white/85 leading-relaxed whitespace-pre-line">
              {DESCRIPTIONS.batch.presetGuide.simple}
            </p>
            <InfoAccordion>
              <p className="whitespace-pre-line">{DESCRIPTIONS.batch.presetGuide.technical}</p>
            </InfoAccordion>
          </div>
        )}

        {profiles.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-8 text-center text-white/30 text-sm">
            プロファイルがありません。追加またはプリセットを読み込んでください。
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <div key={profile.id} className="bg-white/5 rounded-xl p-4">
                {isDefaultPresetName(profile) && (
                  <div className="mb-3 bg-amber-500/10 border border-amber-400/30 rounded-lg p-2">
                    <p className="text-xs text-amber-300">
                      💡 プロファイル名が「{profile.name}」のままです。
                      用途に合わせた名前（例: truck / tools など）に変更することをおすすめします。
                      このまま使うと <span className="font-mono">{profile.name}-a.jpg</span> のような一般的な名前で出力されます。
                    </p>
                    <button
                      onClick={() => { setEditingProfile(profile); setIsEditorOpen(true); }}
                      className="mt-1 text-xs text-amber-400 hover:text-amber-300 underline"
                    >
                      今すぐ編集
                    </button>
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white text-sm">
                        {profile.displayName || profile.name}
                      </span>
                      <span className="text-xs font-mono text-white/30">
                        {profile.aspectRatio.value} · {profile.format.split("/")[1].toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {profile.variants.map((v) => (
                        <p key={v.id} className="text-xs text-white/40 font-mono">
                          {profile.baseFilename}-*{v.suffix}.{FORMAT_EXT[profile.format]} —{" "}
                          {v.width}×{v.height}px
                          {formatRange(v) ? ` / ${formatRange(v)}` : ""}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEditingProfile(profile); setIsEditorOpen(true); }}
                      className="text-xs text-white/30 hover:text-white/70 px-2 py-1 rounded transition-colors"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDeleteProfile(profile.id)}
                      className="text-xs text-white/30 hover:text-red-400 px-2 py-1 rounded transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* JSON Import/Export */}
        <div className="flex gap-2 flex-wrap items-center">
          {profiles.length > 0 && (
            <button
              onClick={handleExportJson}
              className="text-xs bg-white/5 hover:bg-white/10 text-white/60 px-3 py-1.5 rounded-lg transition-all"
            >
              プロファイルをJSONで保存
            </button>
          )}
          <button
            onClick={() => jsonInputRef.current?.click()}
            className="text-xs bg-white/5 hover:bg-white/10 text-white/60 px-3 py-1.5 rounded-lg transition-all"
          >
            JSONから読み込み
          </button>
          <button
            onClick={() => setShowJsonGuide(!showJsonGuide)}
            className="text-xs text-white/40 hover:text-sky-400 transition-colors flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5"
          >
            <span>{showJsonGuide ? "▲" : ""}</span>
            <span>使い方</span>
          </button>
        </div>

        {showJsonGuide && (
          <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-white/10">
            <p className="text-sm text-white/85 leading-relaxed whitespace-pre-line">
              {DESCRIPTIONS.batch.jsonIO.simple}
            </p>
            <InfoAccordion>
              <p className="whitespace-pre-line">{DESCRIPTIONS.batch.jsonIO.technical}</p>
            </InfoAccordion>
          </div>
        )}
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportJson(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* 画像割り当てセクション */}
      {profiles.length > 0 && (
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono text-white/40 uppercase tracking-widest">
              画像を割り当てて生成
            </h2>
            <button
              onClick={() => setShowAssignGuide(!showAssignGuide)}
              className="text-xs text-white/40 hover:text-sky-400 transition-colors flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5"
            >
              <span>{showAssignGuide ? "▲" : ""}</span>
              <span>使い方</span>
            </button>
          </div>

          {showAssignGuide && (
            <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-white/10">
              <p className="text-sm text-white/85 leading-relaxed whitespace-pre-line">
                {DESCRIPTIONS.batch.imageAssign.simple}
              </p>
              <InfoAccordion>
                <p className="whitespace-pre-line">{DESCRIPTIONS.batch.imageAssign.technical}</p>
              </InfoAccordion>
            </div>
          )}

          <div className="space-y-4">
            {assignments.map((assignment) => {
              const profile = profiles.find((p) => p.id === assignment.profileId);
              if (!profile) return null;

              const ext = FORMAT_EXT[profile.format];
              const duplicateSuffixes = findDuplicateSuffixes(assignment.images);
              const hasDuplicates = duplicateSuffixes.size > 0;

              // 生成予定ファイル名を計算
              const plannedFiles = hasDuplicates ? [] : assignment.images.flatMap((img) =>
                profile.variants.map((v) => ({
                  name: buildFilename(profile.baseFilename, img.imageSuffix, v.suffix, ext),
                  range: formatRange(v),
                }))
              );

              return (
                <div key={assignment.profileId} className="bg-white/5 rounded-xl p-4 space-y-3">
                  {/* プロファイルヘッダー */}
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {profile.displayName || profile.name}
                    </p>
                    <p className="text-xs text-white/40 font-mono">
                      {profile.aspectRatio.value} · {profile.format.split("/")[1].toUpperCase()}
                    </p>
                    <div className="mt-1 space-y-0.5">
                      {profile.variants.map((v) => (
                        <p key={v.id} className="text-xs text-white/30 font-mono">
                          {profile.baseFilename}-*{v.suffix}.{ext} — {v.width}×{v.height}px
                          {formatRange(v) ? ` / ${formatRange(v)}` : ""}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* ドロップゾーン（複数追加） */}
                  {assignment.images.length < MAX_IMAGES_PER_PROFILE && (
                    <div
                      className="border border-dashed border-white/20 rounded-lg p-3 text-center cursor-pointer hover:border-sky-400/50 hover:bg-sky-400/5 transition-all"
                      onClick={() => multiFileInputRefs.current[assignment.profileId]?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleAddImages(assignment.profileId, e.dataTransfer.files);
                      }}
                    >
                      <p className="text-xs text-white/30">
                        画像を一括ドロップ or クリックして選択
                        {assignment.images.length > 0 && ` (${assignment.images.length}枚追加済)`}
                      </p>
                      <input
                        ref={(el) => { multiFileInputRefs.current[assignment.profileId] = el; }}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) handleAddImages(assignment.profileId, e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  )}

                  {/* 割当済み画像リスト */}
                  {assignment.images.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-white/40">割当済み（{assignment.images.length}枚）:</p>
                      {assignment.images.map((img) => {
                        const isDuplicate = duplicateSuffixes.has(img.imageSuffix) && !(img.imageSuffix === "" && duplicateSuffixes.has("") === false);
                        const isInvalidSuffix = img.imageSuffix !== "" && !SUFFIX_RE.test(img.imageSuffix);
                        const suffixError = isDuplicate
                          ? "サフィックスが重複しています"
                          : isInvalidSuffix
                          ? "半角英数・ハイフン・アンダースコアのみ使用可"
                          : null;

                        return (
                          <div key={img.id} className="bg-white/5 rounded-lg p-2 space-y-2">
                            <div className="flex items-center gap-2">
                              {/* サムネイル */}
                              {img.previewUrl && (
                                <img
                                  src={img.previewUrl}
                                  alt=""
                                  className="w-10 h-10 object-cover rounded flex-shrink-0"
                                />
                              )}
                              {/* ファイル名 */}
                              <span className="text-xs text-white/50 truncate flex-1 min-w-0">
                                {img.file.name}
                              </span>
                              {/* 削除 */}
                              <button
                                onClick={() => handleRemoveImage(assignment.profileId, img.id)}
                                className="text-white/20 hover:text-red-400 text-sm flex-shrink-0 transition-colors"
                                aria-label="削除"
                              >
                                ×
                              </button>
                            </div>

                            {/* サフィックス入力 */}
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-white/30 flex-shrink-0">suffix:</span>
                                <input
                                  type="text"
                                  placeholder="（空 = suffixなし）"
                                  value={img.imageSuffix}
                                  onChange={(e) =>
                                    handleSuffixChange(assignment.profileId, img.id, e.target.value)
                                  }
                                  className={`flex-1 bg-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/20 outline-none focus:ring-1 ${
                                    suffixError ? "ring-1 ring-red-400 focus:ring-red-400" : "focus:ring-sky-400"
                                  }`}
                                />
                              </div>
                              {suffixError && (
                                <p className="text-xs text-red-400 mt-0.5">{suffixError}</p>
                              )}
                            </div>

                            {/* 生成結果（処理済みの場合） */}
                            {img.results && img.results.length > 0 && (
                              <div className="pt-1 border-t border-white/10 space-y-0.5">
                                {img.results.map((r) => (
                                  <div key={r.variantId} className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-mono text-white/40 truncate">{r.filename}</span>
                                    <span
                                      className={`text-xs font-mono flex-shrink-0 ${
                                        r.warning ? "text-amber-400" : "text-sky-400"
                                      }`}
                                    >
                                      {formatBytes(r.actualBytes)}{r.warning && " ⚠"}
                                    </span>
                                  </div>
                                ))}
                                {img.results.some((r) => r.warning) && (
                                  <div className="space-y-0.5 mt-0.5">
                                    {img.results.filter((r) => r.warning).map((r) => (
                                      <p key={r.variantId} className="text-xs text-amber-400/70">{r.warning}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 重複警告 */}
                  {hasDuplicates && (
                    <p className="text-xs text-red-400">
                      サフィックスが重複しています。全て一意にしてから生成してください。
                    </p>
                  )}

                  {/* 生成予定ファイルリスト */}
                  {plannedFiles.length > 0 && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-white/30">生成予定: {plannedFiles.length}ファイル</p>
                      {plannedFiles.map((f, i) => (
                        <p key={i} className="text-xs font-mono text-white/30">
                          → {f.name}{f.range ? ` (目標 ${f.range})` : ""}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* プログレスバー */}
          {isProcessing && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-white/40">
                <span>処理中...</span>
                <span>{progress.done} / {progress.total}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 transition-all duration-300"
                  style={{
                    width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : "0%",
                  }}
                />
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex gap-3">
            <button
              onClick={processAll}
              disabled={isProcessing || !hasAnyImage || assignments.some((a) => findDuplicateSuffixes(a.images).size > 0)}
              className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all"
            >
              {isProcessing
                ? "生成中..."
                : hasAnyImage
                ? `全て生成（${totalFileCount}ファイル）`
                : "全て生成"}
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
        </div>
      )}

      {/* フッター */}
      <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
        <Link href="/tools" className="text-sm text-white/40 hover:text-white/70 transition-colors">
          ← Tools一覧へ戻る
        </Link>
        <p className="text-xs text-white/30">© 2026 NoviqLab</p>
      </div>

      {/* プロファイル編集モーダル */}
      <ProfileEditor
        profile={editingProfile}
        isOpen={isEditorOpen}
        onSave={handleSaveProfile}
        onClose={() => { setIsEditorOpen(false); setEditingProfile(null); }}
        avifSupported={avifSupported}
      />
    </>
  );
}
