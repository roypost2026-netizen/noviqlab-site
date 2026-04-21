"use client";

import { ReactNode } from "react";

interface InfoAccordionProps {
  title?: string;
  children: ReactNode;
}

export default function InfoAccordion({
  title = "技術に興味のある方へ",
  children,
}: InfoAccordionProps) {
  return (
    <details className="mt-2 group">
      <summary className="cursor-pointer text-xs text-white/60 hover:text-white/80 transition-colors select-none list-none flex items-center gap-1">
        <span className="transition-transform group-open:rotate-90 inline-block">▶</span>
        <span>{title}</span>
      </summary>
      <div className="mt-2 pl-4 py-2 border-l border-white/10 text-sm text-white/75 leading-relaxed space-y-3">
        {children}
      </div>
    </details>
  );
}
