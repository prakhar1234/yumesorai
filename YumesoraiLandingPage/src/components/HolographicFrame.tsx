"use client";

import Image from "next/image";

interface HolographicFrameProps {
  src: string;
  alt: string;
  label: string;
  /** CSS transform for the frame, e.g. "rotateX(12deg) scale(0.98)" */
  tilt?: string;
  /** CSS transform-origin, defaults to "bottom center" */
  tiltOrigin?: string;
  /** CSS transform on hover */
  hoverTilt?: string;
  /** Whether to clip the bottom border-radius (hero style) */
  heroStyle?: boolean;
  /** Blur amount for the glow, defaults to 28px */
  glowBlur?: number;
  /** Extra class on the outer wrapper */
  className?: string;
}

export function HolographicFrame({
  src,
  alt,
  label,
  tilt = "rotateX(12deg) scale(0.98)",
  tiltOrigin = "bottom center",
  hoverTilt = "rotateX(0deg) scale(1.06)",
  heroStyle = false,
  glowBlur = 28,
  className = "",
}: HolographicFrameProps) {
  return (
    <div
      className={`relative ${className}`}
      style={{ perspective: "1800px" }}
    >
      {/* Glow behind */}
      <div
        className="absolute animate-holo-hue"
        style={{
          left: "64px",
          right: "64px",
          top: "56px",
          bottom: "-24px",
          background:
            "conic-gradient(from 210deg, #FF6B6B, #a78bfa, #22d3ee, #6366f1, #FF6B6B)",
          filter: `blur(${glowBlur}px) hue-rotate(0deg)`,
          opacity: 0.4,
          borderRadius: "24px",
        }}
      />
      {/* Frame */}
      <div
        className="group/frame relative z-[1] overflow-hidden transition-all duration-500"
        style={{
          borderRadius: heroStyle ? "16px 16px 0 0" : "14px",
          background:
            "linear-gradient(#0B0E1A, #0B0E1A) padding-box, conic-gradient(from 210deg, rgba(255,107,107,0.9), rgba(167,139,250,0.9), rgba(34,211,238,0.9), rgba(99,102,241,0.9), rgba(255,107,107,0.9)) border-box",
          border: "1.5px solid transparent",
          borderBottom: heroStyle ? "none" : undefined,
          boxShadow:
            "0 -20px 60px rgba(30,27,75,0.12), 0 30px 60px -20px rgba(30,27,75,0.35)",
          transform: tilt,
          transformOrigin: tiltOrigin,
          transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.3, 1)",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.transform = hoverTilt;
          el.style.boxShadow =
            "0 -20px 60px rgba(30,27,75,0.12), 0 60px 110px -24px rgba(30,27,75,0.45)";
          el.style.zIndex = "20";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.transform = tilt;
          el.style.boxShadow =
            "0 -20px 60px rgba(30,27,75,0.12), 0 30px 60px -20px rgba(30,27,75,0.35)";
          el.style.zIndex = "1";
        }}
      >
        {/* Sheen overlay */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-[38%] animate-holo-sheen"
          style={{
            background:
              "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.1) 45%, rgba(167,139,250,0.12) 55%, transparent 100%)",
          }}
        />
        {/* macOS dots + label */}
        <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-3">
          <span className="h-[11px] w-[11px] rounded-full bg-coral opacity-80" />
          <span className="h-[11px] w-[11px] rounded-full bg-yellow-400 opacity-80" />
          <span className="h-[11px] w-[11px] rounded-full bg-green-500 opacity-80" />
          <span className="ml-3.5 font-mono text-xs text-white/45">{label}</span>
        </div>
        {/* Screenshot */}
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={800}
          className="block w-full h-auto"
          priority
        />
      </div>
    </div>
  );
}
