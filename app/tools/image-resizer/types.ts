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
  maxBytes?: number;
  suffix: string;
}

export interface Profile {
  id: string;
  name: string;
  baseFilename: string;
  aspectRatio: AspectRatio;
  cropPosition: CropPosition;
  format: OutputFormat;
  convertToSrgb: boolean;
  stripMetadata: boolean;
  variants: Variant[];
}

export interface BatchProfileAssignment {
  profileId: string;
  file: File | null;
  previewUrl?: string;
  results?: BatchVariantResult[];
  status: FileStatus;
}

export interface BatchVariantResult {
  variantId: string;
  filename: string;
  blob: Blob;
  actualBytes: number;
  targetBytes?: number;
  warning?: string;
}

export interface BatchConfigJson {
  version: string;
  profiles: Profile[];
  exportedAt: string;
}
