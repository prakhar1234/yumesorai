'use client';

import type { CoverageData } from './types';

interface CoveragePanelProps {
  data: CoverageData;
  onClose: () => void;
}

function coverageColor(pct: number): string {
  if (pct >= 90) return '#22c55e';
  if (pct >= 70) return '#eab308';
  if (pct >= 50) return '#f97316';
  return '#ef4444';
}

export function CoveragePanel({ data, onClose }: CoveragePanelProps) {
  const pctColor = coverageColor(data.coverage_pct);

  return (
    <div
      className="w-56 border-l border-[#1e2736] bg-[#0c1018] flex flex-col overflow-y-auto"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e2736]">
        <span className="text-[10px] font-medium text-[#7a869a] tracking-[0.1em] uppercase">
          Coverage
        </span>
        <button
          onClick={onClose}
          className="text-[#5b6577] hover:text-[#dbe4f0] text-[11px] transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Overall coverage */}
      <div className="px-3 py-3 border-b border-[#1e2736]">
        <div className="text-[22px] font-bold" style={{ color: pctColor }}>
          {data.coverage_pct}%
        </div>
        <div className="text-[9px] text-[#5b6577] mt-0.5">
          {data.covered_files} / {data.total_files} files covered
        </div>
        {/* Overall bar */}
        <div className="mt-2 h-1.5 bg-[#1e2736] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${data.coverage_pct}%`, backgroundColor: pctColor }}
          />
        </div>
      </div>

      {/* Per-type breakdown */}
      {Object.keys(data.by_type).length > 0 && (
        <div className="px-3 py-2.5 border-b border-[#1e2736]">
          <div className="text-[9px] text-[#5b6577] tracking-[0.08em] uppercase mb-2">
            By type
          </div>
          <div className="flex flex-col gap-2">
            {Object.entries(data.by_type).map(([type, stats]) => (
              <div key={type}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-[#9fb0c6] capitalize">{type}</span>
                  <span className="text-[9px]" style={{ color: coverageColor(stats.pct) }}>
                    {stats.covered}/{stats.total}
                  </span>
                </div>
                <div className="h-1 bg-[#1e2736] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${stats.pct}%`,
                      backgroundColor: coverageColor(stats.pct),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing files */}
      {data.missing_files.length > 0 && (
        <div className="px-3 py-2.5 border-b border-[#1e2736]">
          <div className="text-[9px] text-[#ef4444] tracking-[0.08em] uppercase mb-1.5">
            Missing ({data.missing_files.length})
          </div>
          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
            {data.missing_files.map((f, i) => (
              <div key={i} className="text-[9px] text-[#9fb0c6] flex items-start gap-1">
                <span className="text-[#ef4444] mt-px">·</span>
                <div>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-[8px] text-[#5b6577]">{f.path}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extra nodes */}
      {data.extra_nodes.length > 0 && (
        <div className="px-3 py-2.5">
          <div className="text-[9px] text-[#eab308] tracking-[0.08em] uppercase mb-1.5">
            Extra nodes ({data.extra_nodes.length})
          </div>
          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
            {data.extra_nodes.map((n, i) => (
              <div key={i} className="text-[9px] text-[#9fb0c6] flex items-center gap-1">
                <span className="text-[#eab308]">·</span>
                <span>{n.id}</span>
                <span className="text-[8px] text-[#5b6577] capitalize">({n.type})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
