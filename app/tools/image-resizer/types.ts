export type OutputFormat = "image/jpeg" | "image/png" | "image/webp" | "image/avif";
export type FileStatus = "waiting" | "processing" | "done" | "error";

export type AspectRatioPreset = "16:9" | "3:2" | "4:3" | "1:1" | "custom";
export type CropPosition = "center" | "top" | "bottom";

export interface AspectRatio {
  type: "preset" | "custom";
  value: AspectRatioPreset;
  customWidth?: number;
  customHeight?: number;
}

export interface Variant {
  id: string;
  name: string;
  width: number;
  height: number;
  minBytes?: number; // NEW: 容量下限（任意）
  maxBytes?: number;
  suffix: string;
}

export interface Profile {
  id: string;
  name: string;
  displayName?: string; // NEW: UI表示名（任意、省略時は name を使う）
  baseFilename: string;
  aspectRatio: AspectRatio;
  cropPosition: CropPosition;
  format: OutputFormat;
  convertToSrgb: boolean;
  stripMetadata: boolean;
  variants: Variant[];
}

/** 1プロファイルに割り当てられた個別画像 */
export interface AssignedImage {
  id: string;
  file: File;
  imageSuffix: string;       // "-a" / "-b" / "" など
  previewUrl?: string;
  status: FileStatus;
  results?: BatchVariantResult[];
}

export interface BatchProfileAssignment {
  profileId: string;
  /** @deprecated v1.0 互換用。新規実装は images を使う */
  file?: File | null;
  /** 複数画像割当（Day 3〜） */
  images: AssignedImage[];
  status: FileStatus;
}

export interface BatchVariantResult {
  variantId: string;
  imageSuffix?: string;      // NEW: どの画像由来か
  filename: string;
  blob: Blob;
  actualBytes: number;
  targetMinBytes?: number;   // NEW
  targetMaxBytes?: number;   // NEW (旧 targetBytes の後継)
  /** @deprecated targetMaxBytes を使う */
  targetBytes?: number;
  warning?: string;
}

export interface BatchConfigJson {
  version: string; // "1.0" または "2.0"
  profiles: Profile[];
  exportedAt: string;
}

/** JSON読み込み時のスキーマバリデーション + 欠損フィールド補完 */
export function migrateBatchConfig(raw: unknown): BatchConfigJson {
  if (typeof raw !== "object" || raw === null) throw new Error("JSONオブジェクトが必要です");
  const obj = raw as Record<string, unknown>;
  if (!obj.version || !Array.isArray(obj.profiles)) {
    throw new Error("'version' と 'profiles' が必要です");
  }
  const profiles = (obj.profiles as unknown[]).map((p) => {
    if (typeof p !== "object" || p === null) throw new Error("プロファイルが不正です");
    const prof = p as Record<string, unknown>;
    if (!prof.id || !prof.name || !prof.baseFilename || !Array.isArray(prof.variants)) {
      throw new Error("プロファイルの必須フィールドが欠けています");
    }
    // variants の minBytes は undefined で補完（v1.0 互換）
    const variants = (prof.variants as unknown[]).map((v) => {
      if (typeof v !== "object" || v === null) throw new Error("バリアントが不正です");
      return { ...(v as object) } as Variant;
    });
    return {
      ...(prof as object),
      displayName: prof.displayName ?? undefined,
      variants,
    } as Profile;
  });
  return {
    version: String(obj.version),
    profiles,
    exportedAt: String(obj.exportedAt ?? new Date().toISOString()),
  };
}
