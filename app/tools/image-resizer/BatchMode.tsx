"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  Profile,
  Variant,
  BatchProfileAssignment,
  BatchVariantResult,
  BatchConfigJson,
  OutputFormat,
} from "./types";
import { cropAndResize, encodeToTargetSize, detectAvifSupport } from "./imageProcessor";
import { BUILTIN_PRESETS, instantiatePreset } from "./builtinPresets";
import ProfileEditor from "./ProfileEditor";

const FORMAT_EXT: Record<OutputFormat, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const STORAGE_KEY = "image-resizer-batch-profiles";

function genId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateFilename(
  profile: Profile,
  variant: Variant,
  existingFilenames: Set<string>
): string {
  const ext = FORMAT_EXT[profile.format];
  const base = profile.baseFilename;
  const suffix = variant.suffix || "";
  let candidate = `${base}${suffix}.${ext}`;

  if (!existingFilenames.has(candidate)) return candidate;

  let counter = 2;
  while (existingFilenames.has(`${base}${suffix}-${counter}.${ext}`)) {
    counter++;
  }
  return `${base}${suffix}-${counter}.${ext}`;
}

function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Profile[];
  } catch {
    return [];
  }
}

function saveProfiles(profiles: Profile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // プライベートブラウジング等で失敗しても続行
  }
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
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    detectAvifSupport().then(setAvifSupported);
    if (!initialized.current) {
      initialized.current = true;
      const saved = loadProfiles();
      if (saved.length > 0) {
        setProfiles(saved);
        setAssignments(
          saved.map((p) => ({ profileId: p.id, file: null, status: "waiting" }))
        );
      }
    }
  }, []);

  // アンマウント時に Object URL を revoke
  useEffect(() => {
    return () => {
      setAssignments((prev) => {
        prev.forEach((a) => {
          if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
          a.results?.forEach((r) => {
            // results の blob は download 後に revoke 済みまたは GC に任せる
          });
        });
        return prev;
      });
    };
  }, []);

  const syncAssignments = (newProfiles: Profile[]) => {
    setAssignments((prev) => {
      const kept = new Map(prev.map((a) => [a.profileId, a]));
      return newProfiles.map((p) =>
        kept.get(p.id) ?? { profileId: p.id, file: null, status: "waiting" }
      );
    });
  };

  const updateProfiles = (newProfiles: Profile[]) => {
    setProfiles(newProfiles);
    saveProfiles(newProfiles);
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
    if (a?.previewUrl) URL.revokeObjectURL(a.previewUrl);
    updateProfiles(profiles.filter((p) => p.id !== id));
  };

  const handleLoadPreset = (index: number) => {
    const newProfiles = instantiatePreset(index);
    updateProfiles([...profiles, ...newProfiles]);
    setShowPresetDropdown(false);
  };

  const handleFileAssign = (profileId: string, file: File) => {
    setAssignments((prev) => {
      return prev.map((a) => {
        if (a.profileId !== profileId) return a;
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
        return {
          ...a,
          file,
          previewUrl: URL.createObjectURL(file),
          results: undefined,
          status: "waiting",
        };
      });
    });
  };

  const processAll = async () => {
    const ready = assignments.filter((a) => a.file);
    if (ready.length === 0) return;

    const total = ready.reduce((sum, a) => {
      const profile = profiles.find((p) => p.id === a.profileId);
      return sum + (profile?.variants.length ?? 0);
    }, 0);

    setIsProcessing(true);
    setProgress({ done: 0, total });

    let done = 0;

    for (const assignment of ready) {
      const profile = profiles.find((p) => p.id === assignment.profileId);
      if (!profile || !assignment.file) continue;

      const results: BatchVariantResult[] = [];
      const existingFilenames = new Set<string>();

      for (const variant of profile.variants) {
        await new Promise((r) => setTimeout(r, 0)); // UI 応答性維持

        try {
          const img = await loadImage(assignment.file);
          const canvas = cropAndResize(
            img,
            profile.aspectRatio,
            profile.cropPosition,
            variant.width,
            variant.height
          );

          let blob: Blob;
          let warning: string | undefined;

          if (variant.maxBytes) {
            const result = await encodeToTargetSize(canvas, profile.format, variant.maxBytes);
            blob = result.blob;
            warning = result.warning;
          } else {
            const b = await import("./imageProcessor").then((m) =>
              m.canvasToBlob(canvas, profile.format, 0.85)
            );
            blob = b ?? new Blob();
          }

          const filename = generateFilename(profile, variant, existingFilenames);
          existingFilenames.add(filename);

          results.push({
            variantId: variant.id,
            filename,
            blob,
            actualBytes: blob.size,
            targetBytes: variant.maxBytes,
            warning,
          });
        } catch (e) {
          results.push({
            variantId: variant.id,
            filename: `error-${variant.id}.${FORMAT_EXT[profile.format]}`,
            blob: new Blob(),
            actualBytes: 0,
            warning: `処理エラー: ${String(e)}`,
          });
        }

        done++;
        setProgress({ done, total });
      }

      setAssignments((prev) =>
        prev.map((a) =>
          a.profileId === assignment.profileId
            ? { ...a, results, status: "done" }
            : a
        )
      );
    }

    setIsProcessing(false);
  };

  const downloadAll = async () => {
    const allResults = assignments.flatMap((a) => a.results ?? []);
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
      version: "1.0",
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
        const json = JSON.parse(e.target?.result as string) as BatchConfigJson;
        if (!json.version || !Array.isArray(json.profiles)) {
          alert("JSONフォーマットが不正です。'version' と 'profiles' が必要です。");
          return;
        }
        for (const p of json.profiles) {
          if (!p.id || !p.name || !p.baseFilename || !Array.isArray(p.variants)) {
            alert("プロファイルの必須フィールドが欠けています。");
            return;
          }
        }
        updateProfiles(json.profiles);
      } catch {
        alert("JSONの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file);
  };

  const hasResults = assignments.some((a) => a.results && a.results.length > 0);

  return (
    <>
      {/* プロファイル管理セクション */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono text-white/40 uppercase tracking-widest">
            バッチプロファイル
          </h2>
          <div className="flex gap-2">
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
                <div className="absolute right-0 top-full mt-1 w-56 bg-[#0b1120] border border-white/10 rounded-xl z-20 overflow-hidden">
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
          </div>
        </div>

        {profiles.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-8 text-center text-white/30 text-sm">
            プロファイルがありません。追加またはプリセットを読み込んでください。
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <div key={profile.id} className="bg-white/5 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white text-sm">{profile.name}</span>
                      <span className="text-xs font-mono text-white/30">
                        {profile.aspectRatio.value} · {profile.format.split("/")[1].toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {profile.variants.map((v) => (
                        <p key={v.id} className="text-xs text-white/40 font-mono">
                          {profile.baseFilename}{v.suffix}.{FORMAT_EXT[profile.format]} —{" "}
                          {v.width}×{v.height}px
                          {v.maxBytes ? ` / 上限 ${Math.round(v.maxBytes / 1024)}KB` : ""}
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
        {profiles.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleExportJson}
              className="text-xs bg-white/5 hover:bg-white/10 text-white/60 px-3 py-1.5 rounded-lg transition-all"
            >
              プロファイルをJSONで保存
            </button>
            <button
              onClick={() => jsonInputRef.current?.click()}
              className="text-xs bg-white/5 hover:bg-white/10 text-white/60 px-3 py-1.5 rounded-lg transition-all"
            >
              JSONから読み込み
            </button>
          </div>
        )}
        {profiles.length === 0 && (
          <button
            onClick={() => jsonInputRef.current?.click()}
            className="text-xs bg-white/5 hover:bg-white/10 text-white/60 px-3 py-1.5 rounded-lg transition-all"
          >
            JSONから読み込み
          </button>
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
          <h2 className="text-sm font-mono text-white/40 uppercase tracking-widest">
            画像を割り当てて生成
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map((assignment) => {
              const profile = profiles.find((p) => p.id === assignment.profileId);
              if (!profile) return null;

              return (
                <div key={assignment.profileId} className="bg-white/5 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{profile.name}</p>
                    <p className="text-xs text-white/40 font-mono">{profile.baseFilename}</p>
                  </div>

                  {/* ドロップゾーン */}
                  <div
                    className="border border-dashed border-white/20 rounded-lg p-4 text-center cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all relative"
                    onClick={() => fileInputRefs.current[assignment.profileId]?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file?.type.startsWith("image/")) handleFileAssign(assignment.profileId, file);
                    }}
                  >
                    {assignment.previewUrl ? (
                      <img
                        src={assignment.previewUrl}
                        alt=""
                        className="w-full h-20 object-cover rounded"
                      />
                    ) : (
                      <p className="text-xs text-white/30">画像をドロップ or クリック</p>
                    )}
                    {assignment.file && (
                      <p className="text-xs text-white/40 mt-1 truncate">{assignment.file.name}</p>
                    )}
                    <input
                      ref={(el) => { fileInputRefs.current[assignment.profileId] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileAssign(assignment.profileId, file);
                        e.target.value = "";
                      }}
                    />
                  </div>

                  {/* 生成ファイル名プレビュー */}
                  <div className="space-y-0.5">
                    {profile.variants.map((v) => (
                      <p key={v.id} className="text-xs text-white/30 font-mono">
                        → {profile.baseFilename}{v.suffix}.{FORMAT_EXT[profile.format]}
                      </p>
                    ))}
                  </div>

                  {/* 結果表示 */}
                  {assignment.results && (
                    <div className="space-y-1 pt-2 border-t border-white/10">
                      {assignment.results.map((r) => (
                        <div key={r.variantId} className="flex items-start justify-between gap-1">
                          <span className="text-xs font-mono text-white/50 truncate">{r.filename}</span>
                          <span
                            className={`text-xs font-mono flex-shrink-0 ${
                              r.warning ? "text-amber-400" : "text-sky-400"
                            }`}
                          >
                            {formatBytes(r.actualBytes)}
                            {r.warning && " ⚠"}
                          </span>
                        </div>
                      ))}
                      {assignment.results.some((r) => r.warning) && (
                        <div className="mt-1 space-y-0.5">
                          {assignment.results
                            .filter((r) => r.warning)
                            .map((r) => (
                              <p key={r.variantId} className="text-xs text-amber-400/70">
                                {r.warning}
                              </p>
                            ))}
                        </div>
                      )}
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
                  style={{ width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : "0%" }}
                />
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex gap-3">
            <button
              onClick={processAll}
              disabled={isProcessing || assignments.every((a) => !a.file)}
              className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all"
            >
              {isProcessing ? "生成中..." : "全て生成"}
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

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("画像の読み込みに失敗しました")); };
    img.src = url;
  });
}
