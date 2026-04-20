import type { Profile } from "./types";

type PresetDefinition = {
  presetName: string;
  description: string;
  profiles: Omit<Profile, "id">[];
};

export const BUILTIN_PRESETS: PresetDefinition[] = [
  {
    presetName: "Web制作・ヒーロー用",
    description: "16:9のヒーロー画像をPC用とモバイル用の2サイズで出力",
    profiles: [
      {
        name: "hero",
        baseFilename: "hero",
        aspectRatio: { type: "preset", value: "16:9" },
        cropPosition: "center",
        format: "image/jpeg",
        convertToSrgb: true,
        stripMetadata: true,
        variants: [
          { id: "v-hero-2x", name: "@2x",   width: 1600, height: 900, minBytes: 204800, maxBytes: 307200, suffix: "@2x" },
          { id: "v-hero-sp", name: "mobile", width: 800,  height: 450, minBytes: 81920,  maxBytes: 122880, suffix: "" },
        ],
      },
    ],
  },
  {
    presetName: "Web制作・コンテンツ用",
    description: "3:2のコンテンツ画像をPC用とモバイル用の2サイズで出力",
    profiles: [
      {
        name: "content",
        baseFilename: "content",
        aspectRatio: { type: "preset", value: "3:2" },
        cropPosition: "center",
        format: "image/jpeg",
        convertToSrgb: true,
        stripMetadata: true,
        variants: [
          { id: "v-content-2x", name: "@2x",   width: 1200, height: 800, minBytes: 153600, maxBytes: 204800, suffix: "@2x" },
          { id: "v-content-sp", name: "mobile", width: 600,  height: 400, minBytes: 61440,  maxBytes: 92160,  suffix: "" },
        ],
      },
    ],
  },
  {
    presetName: "Web制作・プロフィール",
    description: "正方形プロフィール画像を1サイズで出力",
    profiles: [
      {
        name: "profile",
        baseFilename: "profile",
        aspectRatio: { type: "preset", value: "1:1" },
        cropPosition: "center",
        format: "image/jpeg",
        convertToSrgb: true,
        stripMetadata: true,
        variants: [
          { id: "v-profile", name: "main", width: 600, height: 600, minBytes: 51200, maxBytes: 81920, suffix: "" },
        ],
      },
    ],
  },
  {
    presetName: "ブログ記事用",
    description: "ブログ記事のアイキャッチをWebP形式でPC/モバイル向けに出力",
    profiles: [
      {
        name: "blog",
        baseFilename: "blog",
        aspectRatio: { type: "preset", value: "16:9" },
        cropPosition: "center",
        format: "image/webp",
        convertToSrgb: true,
        stripMetadata: true,
        variants: [
          { id: "v-blog-2x", name: "@2x",   width: 1600, height: 900, minBytes: 153600, maxBytes: 256000, suffix: "@2x" },
          { id: "v-blog-sp", name: "mobile", width: 800,  height: 450, minBytes: 61440,  maxBytes: 102400, suffix: "" },
        ],
      },
    ],
  },
  {
    presetName: "EC商品写真",
    description: "ECサイト用の正方形商品画像を大サイズとサムネの2種で出力",
    profiles: [
      {
        name: "product",
        baseFilename: "product",
        aspectRatio: { type: "preset", value: "1:1" },
        cropPosition: "center",
        format: "image/jpeg",
        convertToSrgb: true,
        stripMetadata: true,
        variants: [
          { id: "v-product-lg", name: "large", width: 1200, height: 1200, minBytes: 204800, maxBytes: 409600, suffix: "" },
          { id: "v-product-sm", name: "thumb", width: 300,  height: 300,  minBytes: 20480,  maxBytes: 51200,  suffix: "-thumb" },
        ],
      },
    ],
  },
  {
    presetName: "OGP / SNS",
    description: "OGPやSNSシェア用の横長画像を出力",
    profiles: [
      {
        name: "ogp",
        baseFilename: "ogp",
        aspectRatio: { type: "preset", value: "16:9" },
        cropPosition: "center",
        format: "image/jpeg",
        convertToSrgb: true,
        stripMetadata: true,
        variants: [
          { id: "v-ogp", name: "main", width: 1200, height: 630, minBytes: 153600, maxBytes: 256000, suffix: "" },
        ],
      },
    ],
  },
];

function genId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function instantiatePreset(presetIndex: number): Profile[] {
  const preset = BUILTIN_PRESETS[presetIndex];
  if (!preset) return [];
  return preset.profiles.map((p) => ({
    ...p,
    id: genId(),
  }));
}
