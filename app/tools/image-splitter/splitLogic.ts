import JSZip from "jszip";
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

const WHITESPACE_TOLERANCE = 10;
const SEARCH_RANGE = 50;

interface WhitespaceBlock {
  start: number;
  end: number;
  size: number;
  center: number;
}

function detectWhitespaceBlocks(
  imageData: ImageData,
  tolerance: number = WHITESPACE_TOLERANCE
): WhitespaceBlock[] {
  const { data, width, height } = imageData;
  const blocks: WhitespaceBlock[] = [];
  let currentStart: number | null = null;

  for (let y = 0; y < height; y++) {
    const rowStart = y * width * 4;
    const baseR = data[rowStart];
    const baseG = data[rowStart + 1];
    const baseB = data[rowStart + 2];

    let isWhitespace = true;
    for (let x = 1; x < width; x++) {
      const i = rowStart + x * 4;
      if (
        Math.abs(data[i] - baseR) > tolerance ||
        Math.abs(data[i + 1] - baseG) > tolerance ||
        Math.abs(data[i + 2] - baseB) > tolerance
      ) {
        isWhitespace = false;
        break;
      }
    }

    if (isWhitespace) {
      if (currentStart === null) currentStart = y;
    } else {
      if (currentStart !== null) {
        blocks.push({
          start: currentStart,
          end: y - 1,
          size: y - currentStart,
          center: Math.floor((currentStart + y - 1) / 2),
        });
        currentStart = null;
      }
    }
  }

  if (currentStart !== null) {
    blocks.push({
      start: currentStart,
      end: height - 1,
      size: height - currentStart,
      center: Math.floor((currentStart + height - 1) / 2),
    });
  }

  return blocks;
}

function findBestCutPosition(
  idealY: number,
  blocks: WhitespaceBlock[],
  searchRange: number = SEARCH_RANGE
): number {
  const minY = idealY - searchRange;
  const maxY = idealY + searchRange;

  const candidates = blocks.filter(
    (b) => b.center >= minY && b.center <= maxY
  );

  if (candidates.length === 0) return idealY;

  let bestBlock = candidates[0];
  let bestScore = candidates[0].size * 2 - Math.abs(candidates[0].center - idealY);

  for (let i = 1; i < candidates.length; i++) {
    const score = candidates[i].size * 2 - Math.abs(candidates[i].center - idealY);
    if (score > bestScore) {
      bestScore = score;
      bestBlock = candidates[i];
    }
  }

  return bestBlock.center;
}

export async function calcSmartSplitPositions(
  imageFile: ImageFile,
  settings: SplitSettings
): Promise<SplitPosition[]> {
  const idealPositions = calcSplitPositions(imageFile, settings);
  if (idealPositions.length === 0) return [];

  const img = await loadImageElement(URL.createObjectURL(imageFile.file));
  const canvas = document.createElement("canvas");
  canvas.width = imageFile.width;
  canvas.height = imageFile.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context 取得失敗");

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, imageFile.width, imageFile.height);

  const blocks = detectWhitespaceBlocks(imageData);

  const adjustedPositions: SplitPosition[] = idealPositions.map((p) => ({
    y: findBestCutPosition(p.y, blocks),
  }));

  const uniqueYs = new Set<number>();
  const deduped: SplitPosition[] = [];
  for (const p of adjustedPositions) {
    if (!uniqueYs.has(p.y)) {
      uniqueYs.add(p.y);
      deduped.push(p);
    }
  }

  return deduped;
}

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

export async function createSplitZip(
  results: SplitResult[],
  originalFilename: string
): Promise<Blob> {
  const zip = new JSZip();

  for (const result of results) {
    zip.file(result.filename, result.blob);
  }

  return await zip.generateAsync({ type: "blob" });
}

export function getBaseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}
