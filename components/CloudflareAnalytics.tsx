"use client";

import Script from "next/script";

export default function CloudflareAnalytics() {
  const token = process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN;

  if (!token) return null;

  return (
    <Script
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={`{"token": "${token}"}`}
      strategy="afterInteractive"
      defer
    />
  );
}
