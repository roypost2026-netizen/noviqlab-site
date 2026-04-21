"use client";

import { useState } from "react";
import InfoAccordion from "@/components/tools/common/InfoAccordion";

interface IntroToggleProps {
  buttonLabel: string;
  simpleText: string;
  technicalText: string;
  variant?: "default" | "privacy";
}

export default function IntroToggle({
  buttonLabel,
  simpleText,
  technicalText,
  variant = "default",
}: IntroToggleProps) {
  const [expanded, setExpanded] = useState(false);

  const bgClass = variant === "privacy"
    ? "bg-sky-500/10 border border-sky-400/20"
    : "bg-white/5";

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
          variant === "privacy"
            ? "bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 border border-sky-400/20"
            : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
        }`}
        aria-expanded={expanded}
      >
        {buttonLabel} {expanded ? "▲" : "▼"}
      </button>
      {expanded && (
        <div className={`mt-3 ${bgClass} rounded-xl p-5`}>
          <p className="text-base text-white/90 leading-relaxed whitespace-pre-line">
            {simpleText}
          </p>
          <InfoAccordion>
            <p className="whitespace-pre-line">{technicalText}</p>
          </InfoAccordion>
        </div>
      )}
    </div>
  );
}
