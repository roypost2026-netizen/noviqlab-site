import type { OutputFormat, AspectRatio, CropPosition, Profile, Variant } from "./types";

export async function detectAvifSupport(): Promise<boolean> {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob?.type === "image/avif"), "image/avif");
  });
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const q = format === "image/png" ? undefined : quality;
    canvas.toBlob((blob) => resolve(blob), format, q);
  });
}

// 8.2 修正済み: && → || で横長・縦長画像も段階縮小が効く
export function stepDownResize(
  source: HTMLCanvasElement | HTMLImageElement | ImageBitmap,
  targetW: number,
  targetH: number
): HTMLCanvasElement {
  let canvas = document.createElement("canvas");

  if (source instanceof ImageBitmap) {
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    ctx.drawImage(source, 0, 0);
  } else if (source instanceof HTMLImageElement) {
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    ctx.drawImage(source, 0, 0);
  } else {
    canvas = source;
  }

  while (canvas.width / 2 > targetW || canvas.height / 2 > targetH) {
    const tmp = document.createElement("canvas");
    tmp.width = Math.max(1, Math.floor(canvas.width / 2));
    tmp.height = Math.max(1, Math.floor(canvas.height / 2));
    const ctx = tmp.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(canvas, 0, 0, tmp.width, tmp.height);
    canvas = tmp;
  }

  return canvas;
}

export function fillJpegBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bgColor: string
): void {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
}

// アスペクト比の実数値を計算
function resolveAspectRatioValue(ar: AspectRatio): number {
  if (ar.type === "custom" && ar.customWidth && ar.customHeight) {
    return ar.customWidth / ar.customHeight;
  }
  const presetMap: Record<string, number> = {
    "16:9": 16 / 9,
    "3:2": 3 / 2,
    "4:3": 4 / 3,
    "1:1": 1,
  };
  return presetMap[ar.value] ?? 1;
}

type CropSource = HTMLImageElement | ImageBitmap;

function getSourceDimensions(source: CropSource): { width: number; height: number } {
  return { width: source.width, height: source.height };
}

function drawSourceToCanvas(
  canvas: HTMLCanvasElement,
  source: CropSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(source as CanvasImageSource, sx, sy, sw, sh, dx, dy, dw, dh);
}

export function cropAndResizeSource(
  source: CropSource,
  aspectRatio: AspectRatio,
  cropPosition: CropPosition,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  const targetAR = resolveAspectRatioValue(aspectRatio);
  const { width: srcW, height: srcH } = getSourceDimensions(source);
  const srcAR = srcW / srcH;

  let cropX = 0;
  let cropY = 0;
  let cropW = srcW;
  let cropH = srcH;

  if (srcAR > targetAR) {
    cropW = Math.round(srcH * targetAR);
    cropX = Math.round((srcW - cropW) / 2);
  } else if (srcAR < targetAR) {
    cropH = Math.round(srcW / targetAR);
    const excessHeight = srcH - cropH;
    switch (cropPosition) {
      case "top":    cropY = 0; break;
      case "bottom": cropY = excessHeight; break;
      case "center":
      default:       cropY = Math.round(excessHeight / 2); break;
    }
  }

  const intermediate = document.createElement("canvas");
  intermediate.width = cropW;
  intermediate.height = cropH;
  drawSourceToCanvas(intermediate, source, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  const stepped = stepDownResize(intermediate, targetWidth, targetHeight);

  const final = document.createElement("canvas");
  final.width = targetWidth;
  final.height = targetHeight;
  const ctx = final.getContext("2d");
  if (!ctx) return final;
  ctx.drawImage(stepped, 0, 0, targetWidth, targetHeight);

  return final;
}

// 後方互換: HTMLImageElement 専用（Day 2 の BatchMode で使用）
export function cropAndResize(
  img: HTMLImageElement,
  aspectRatio: AspectRatio,
  cropPosition: CropPosition,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  return cropAndResizeSource(img, aspectRatio, cropPosition, targetWidth, targetHeight);
}

export async function encodeToTargetSize(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  targetBytes: number,
  maxIterations = 8
): Promise<{ blob: Blob; quality: number; attempts: number; warning?: string }> {
  if (format === "image/png") {
    const blob = await canvasToBlob(canvas, format, 1);
    if (!blob) {
      return { blob: new Blob(), quality: 1, attempts: 1, warning: "変換に失敗しました" };
    }
    const warning =
      blob.size > targetBytes
        ? `PNG は品質調整不可のため目標容量を超過しています（実容量: ${Math.round(blob.size / 1024)}KB）`
        : undefined;
    return { blob, quality: 1, attempts: 1, warning };
  }

  let attempts = 0;
  let blob = await canvasToBlob(canvas, format, 0.85);
  attempts++;
  if (blob && blob.size <= targetBytes) {
    return { blob, quality: 0.85, attempts };
  }

  let low = 0.1;
  let high = 0.95;
  let best: Blob | null = null;
  let bestQuality = 0.85;

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    blob = await canvasToBlob(canvas, format, mid);
    attempts++;
    if (!blob) break;

    if (blob.size <= targetBytes) {
      best = blob;
      bestQuality = mid;
      low = mid;
    } else {
      high = mid;
    }
    if (high - low < 0.02) break;
  }

  if (!best) {
    const fallback = await canvasToBlob(canvas, format, 0.1);
    attempts++;
    const fb = fallback ?? new Blob();
    return {
      blob: fb,
      quality: 0.1,
      attempts,
      warning: `目標容量（${Math.round(targetBytes / 1024)}KB）に収まりませんでした（最低品質での実容量: ${Math.round(fb.size / 1024)}KB）`,
    };
  }

  return { blob: best, quality: bestQuality, attempts };
}

/** 容量範囲（min〜max）での自動調整（Day 3 追加） */
export async function encodeToTargetRange(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  minBytes: number | undefined,
  maxBytes: number | undefined,
  maxIterations = 8
): Promise<{ blob: Blob; quality: number; warning?: string }> {
  // 両方なし → 品質85%固定
  if (!minBytes && !maxBytes) {
    const blob = await canvasToBlob(canvas, format, 0.85);
    return { blob: blob ?? new Blob(), quality: 0.85 };
  }

  // maxBytesのみ → 従来の encodeToTargetSize
  if (!minBytes) {
    const result = await encodeToTargetSize(canvas, format, maxBytes!, maxIterations);
    return { blob: result.blob, quality: result.quality, warning: result.warning };
  }

  // minBytesのみ → 品質85%で試し、下回るなら90/95/1.0 と上げる
  if (!maxBytes) {
    for (const q of [0.85, 0.90, 0.95, 1.0]) {
      const blob = await canvasToBlob(canvas, format, q);
      if (!blob) continue;
      if (blob.size >= minBytes) return { blob, quality: q };
    }
    const blob = await canvasToBlob(canvas, format, 1.0);
    const fb = blob ?? new Blob();
    return {
      blob: fb,
      quality: 1.0,
      warning: `容量下限（${Math.round(minBytes / 1024)}KB）を確保できませんでした（実容量: ${Math.round(fb.size / 1024)}KB）`,
    };
  }

  // 両方あり → maxBytes以下で最高品質を探し、minBytes 下回り時は警告
  const result = await encodeToTargetSize(canvas, format, maxBytes, maxIterations);
  if (result.blob.size < minBytes) {
    return {
      blob: result.blob,
      quality: result.quality,
      warning: result.warning
        ?? `容量が下限（${Math.round(minBytes / 1024)}KB）を下回っています（実容量: ${Math.round(result.blob.size / 1024)}KB）`,
    };
  }
  return { blob: result.blob, quality: result.quality, warning: result.warning };
}

/** sRGB 正規化付き画像ロード（D-07）。非対応時は null を返す */
export async function loadImageBitmap(file: File): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap === "undefined") return null;
  try {
    return await createImageBitmap(file, {
      colorSpaceConversion: "default",
      imageOrientation: "from-image",
    });
  } catch {
    return null;
  }
}

/** HTMLImageElement フォールバック */
function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("画像の読み込みに失敗しました")); };
    img.src = url;
  });
}

/**
 * バッチモード専用の画像処理関数（Day 3）。
 * sRGB変換 → クロップ → リサイズ → 容量範囲最適化を一括実行。
 */
export async function processBatchImage(
  file: File,
  profile: Profile,
  variant: Variant
): Promise<{ blob: Blob; warning?: string }> {
  // 1. 画像読み込み（createImageBitmap 優先、fallback HTMLImageElement）
  const bitmap = await loadImageBitmap(file);
  let canvas: HTMLCanvasElement;

  if (bitmap) {
    canvas = cropAndResizeSource(bitmap, profile.aspectRatio, profile.cropPosition, variant.width, variant.height);
    bitmap.close();
  } else {
    const img = await loadImageElement(file);
    canvas = cropAndResizeSource(img, profile.aspectRatio, profile.cropPosition, variant.width, variant.height);
  }

  // 2. 容量範囲最適化
  const result = await encodeToTargetRange(canvas, profile.format, variant.minBytes, variant.maxBytes);
  return { blob: result.blob, warning: result.warning };
}
