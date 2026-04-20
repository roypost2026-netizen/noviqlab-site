import type { OutputFormat, AspectRatio, CropPosition } from "./types";

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
  source: HTMLCanvasElement | HTMLImageElement,
  targetW: number,
  targetH: number
): HTMLCanvasElement {
  let canvas = document.createElement("canvas");
  if (source instanceof HTMLImageElement) {
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

export function cropAndResize(
  img: HTMLImageElement,
  aspectRatio: AspectRatio,
  cropPosition: CropPosition,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  const targetAR = resolveAspectRatioValue(aspectRatio);
  const srcAR = img.width / img.height;

  let cropX = 0;
  let cropY = 0;
  let cropW = img.width;
  let cropH = img.height;

  if (srcAR > targetAR) {
    // 元画像が目標より横長 → 左右を切る（常に中央）
    cropW = Math.round(img.height * targetAR);
    cropX = Math.round((img.width - cropW) / 2);
  } else if (srcAR < targetAR) {
    // 元画像が目標より縦長 → 上下を切る（cropPosition で制御）
    cropH = Math.round(img.width / targetAR);
    const excessHeight = img.height - cropH;
    switch (cropPosition) {
      case "top":
        cropY = 0;
        break;
      case "bottom":
        cropY = excessHeight;
        break;
      case "center":
      default:
        cropY = Math.round(excessHeight / 2);
        break;
    }
  }

  // クロップした領域を step-down で縮小
  const intermediate = document.createElement("canvas");
  intermediate.width = cropW;
  intermediate.height = cropH;
  const ctx0 = intermediate.getContext("2d");
  if (!ctx0) return intermediate;
  ctx0.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  const stepped = stepDownResize(intermediate, targetWidth, targetHeight);

  const final = document.createElement("canvas");
  final.width = targetWidth;
  final.height = targetHeight;
  const ctx = final.getContext("2d");
  if (!ctx) return final;
  ctx.drawImage(stepped, 0, 0, targetWidth, targetHeight);

  return final;
}

export async function encodeToTargetSize(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  targetBytes: number,
  maxIterations = 8
): Promise<{ blob: Blob; quality: number; attempts: number; warning?: string }> {
  // PNG は品質パラメータが効かない
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

  // 初回: 品質85%で試す
  let blob = await canvasToBlob(canvas, format, 0.85);
  attempts++;
  if (blob && blob.size <= targetBytes) {
    return { blob, quality: 0.85, attempts };
  }

  // 二分探索
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
    // 最低品質でも収まらない場合
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
