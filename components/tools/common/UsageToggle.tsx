"use client";

import { useState, ReactNode } from "react";
import InfoAccordion from "@/components/tools/common/InfoAccordion";

interface UsageToggleProps {
  label: string;
  labelClassName?: string;
  simpleText: string;
  technicalText: string;
  children: ReactNode;
}

export default function UsageToggle({
  label,
  labelClassName = "text-xs text-white/40 uppercase tracking-widest",
  simpleText,
  technicalText,
  children,
}: UsageToggleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className={labelClassName}>{label}</p>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-white/40 hover:text-sky-400 transition-colors flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5"
          aria-expanded={expanded}
        >
          {expanded && <span>▲</span>}
          <span>使い方</span>
        </button>
      </div>
      {expanded && (
        <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-white/10">
          <p className="text-sm text-white/85 leading-relaxed whitespace-pre-line">
            {simpleText}
          </p>
          <InfoAccordion>
            <p className="whitespace-pre-line">{technicalText}</p>
          </InfoAccordion>
        </div>
      )}
      {children}
    </div>
  );
}
