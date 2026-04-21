import type {
  ImageFile,
  SplitSettings,
  SplitPosition,
  SplitResult,
  OutputFormat,
} from "./types";

const FORMAT_EXT: Record<OutputFormat, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function calcSplitPositions(
  imageFile: ImageFile,
  settings: SplitSettings
): SplitPosition[] {
  const { height, width } = imageFile;

  let unitHeight: number;
  if (settings.mode === "fixed") {
    unitHeight = Math.max(100, settings.fixedHeight);
  } else {
    unitHeight = Math.round(width * Math.SQRT2);
  }

  const positions: SplitPosition[] = [];
  let currentY = unitHeight;
  while (currentY < height) {
    positions.push({ y: currentY });
    currentY += unitHeight;
  }

  return positions;
}

export async function splitImage(
  imageFile: ImageFile,
  positions: SplitPosition[]
): Promise<SplitResult[]> {
  const { file, format, width, height } = imageFile;

  const img = await loadImageElement(URL.createObjectURL(file));

  const boundaries = [0, ...positions.map((p) => p.y), height];
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const ext = FORMAT_EXT[format];
  const totalPieces = boundaries.length - 1;
  const padLength = String(totalPieces).length;

  const results: SplitResult[] = [];

  for (let i = 0; i < totalPieces; i++) {
    const top = boundaries[i];
    const bottom = boundaries[i + 1];
    const pieceHeight = bottom - top;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = pieceHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context 取得失敗");

    ctx.drawImage(img, 0, top, width, pieceHeight, 0, 0, width, pieceHeight);

    const blob = await canvasToBlob(canvas, format);
    const url = URL.createObjectURL(blob);

    const partNum = String(i + 1).padStart(Math.max(2, padLength), "0");
    const filename = `${baseName}-part${partNum}.${ext}`;

    results.push({
      id: crypto.randomUUID(),
      blob,
      url,
      filename,
      width,
      height: pieceHeight,
      size: blob.size,
    });
  }

  return results;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Blob 生成失敗"));
      },
      format,
      format === "image/jpeg" || format === "image/webp" ? quality : undefined
    );
  });
}
