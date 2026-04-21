export type SplitMode = "fixed" | "a4";

export type OutputFormat = "image/png" | "image/jpeg" | "image/webp";

export interface SplitSettings {
  mode: SplitMode;
  fixedHeight: number;
  smartSplit: boolean;
}

export interface ImageFile {
  id: string;
  file: File;
  objectUrl: string;
  width: number;
  height: number;
  format: OutputFormat;
}

export interface SplitResult {
  id: string;
  blob: Blob;
  url: string;
  filename: string;
  width: number;
  height: number;
  size: number;
}

export interface SplitPosition {
  y: number;
}
