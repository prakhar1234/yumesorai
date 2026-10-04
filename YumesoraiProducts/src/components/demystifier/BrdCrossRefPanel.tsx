'use client';

import { useState } from 'react';
import {
  BrdData,
  CodeReference,
  TraceableItemData,
  isTraceableItem,
  isTraceableArray,
  SECTION_LABELS,
  formatSectionKey,
} from './BrdModal';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface BrdCrossRefPanelProps {
  data: BrdData;
  filePath: string;
  selectedFile: string;
  activeLines: string | null; // currently-highlighted line range string
  onNavigateToLines: (linesStr: string) => void;
  onOpenFullBrd: () => void;
  onClose: () => void;
  onSwitchFile: (filePath: string) => void;
}

// ---------------------------------------------------------------------------
// Line-reference chip
// ---------------------------------------------------------------------------
function LineChip({
  codeRef,
  isActive,
  onClick,
}: {
  codeRef: CodeReference;
  isActive: boolean;
  onClick: () => void;
}) {
  const label = codeRef.paragraph
    ? `${codeRef.paragraph}:${codeRef.lines}`
    : `lines ${codeRef.lines}`;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[9px] rounded px-1.5 py-0.5 transition-colors"
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        color: isActive ? '#45c4b0' : '#d29922',
        backgroundColor: isActive ? '#45c4b015' : '#d2992215',
        border: `1px solid ${isActive ? '#45c4b040' : '#d2992230'}`,
      }}
      title={`Navigate to ${codeRef.paragraph || ''} lines ${codeRef.lines}`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Traceable item row (statement + chips)
// ---------------------------------------------------------------------------
function CrossRefItem({
  item,
  activeLines,
  onNavigateToLines,
}: {
  item: TraceableItemData;
  activeLines: string | null;
  onNavigateToLines: (linesStr: string) => void;
}) {
  return (
    <li className="text-[11px] text-[#dbe4f0] leading-relaxed">
      <span>{item.statement}</span>
      {item.code_references && item.code_references.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {item.code_references.map((cr, j) => (
            <LineChip
              key={j}
              codeRef={cr}
              isActive={activeLines === cr.lines}
              onClick={() => onNavigateToLines(cr.lines)}
            />
          ))}
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Render a section value — cross-ref variant (no code snippets, just chips)
// ---------------------------------------------------------------------------
function renderCrossRefValue(
  value: unknown,
  activeLines: string | null,
  onNavigateToLines: (linesStr: string) => void,
): JSX.Element {
  if (typeof value === 'string') {
    return (
      <p className="text-[11px] text-[#dbe4f0] leading-relaxed whitespace-pre-wrap">
        {value}
      </p>
    );
  }

  if (isTraceableArray(value)) {
    return (
      <ul className="space-y-2">
        {value.map((item, i) => (
          <CrossRefItem
            key={i}
            item={item}
            activeLines={activeLines}
            onNavigateToLines={onNavigateToLines}
          />
        ))}
      </ul>
    );
  }

  if (Array.isArray(value)) {
    return (
      <ul className="space-y-1.5">
        {value.map((item, i) => (
          <li key={i} className="text-[11px] text-[#dbe4f0] leading-relaxed">
            {typeof item === 'string'
              ? item
              : isTraceableItem(item)
                ? (
                  <CrossRefItem
                    item={item}
                    activeLines={activeLines}
                    onNavigateToLines={onNavigateToLines}
                  />
                )
                : JSON.stringify(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    return (
      <div className="space-y-2">
        {Object.entries(obj).map(([k, v]) => (
          <div key={k}>
            <span
              className="text-[9px] text-[#7a869a] uppercase tracking-wider block mb-1"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {k.replace(/_/g, ' ')}
            </span>
            {renderCrossRefValue(v, activeLines, onNavigateToLines)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <p className="text-[11px] text-[#dbe4f0]">{String(value)}</p>
  );
}

// ---------------------------------------------------------------------------
// Collapsible section accordion
// ---------------------------------------------------------------------------
function SectionAccordion({
  sectionKey,
  value,
  activeLines,
  onNavigateToLines,
}: {
  sectionKey: string;
  value: unknown;
  activeLines: string | null;
  onNavigateToLines: (linesStr: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-[#1e2736]">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-[#111823] transition-colors"
      >
        <span className="text-[10px] text-[#5b6577]">
          {open ? '▾' : '▸'}
        </span>
        <span
          className="text-[10px] text-[#45c4b0] uppercase tracking-wider"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {formatSectionKey(sectionKey)}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          {renderCrossRefValue(value, activeLines, onNavigateToLines)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function BrdCrossRefPanel({
  data,
  filePath,
  selectedFile,
  activeLines,
  onNavigateToLines,
  onOpenFullBrd,
  onClose,
  onSwitchFile,
}: BrdCrossRefPanelProps) {
  const fileMismatch = selectedFile !== filePath;

  return (
    <div className="w-[360px] border-l border-[#1e2736] bg-[#0c1018] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e2736]">
        <div className="min-w-0">
          <span
            className="text-[11px] font-semibold text-[#e6edf7] block"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            BRD Cross-Reference
          </span>
          <span
            className="text-[9px] text-[#5b6577] block truncate"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {data.program_id} &middot; {data.program_name}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenFullBrd}
            className="text-[9px] text-[#45c4b0] hover:text-[#7de0cf] bg-[#45c4b010] hover:bg-[#45c4b020] border border-[#45c4b030] rounded px-2 py-0.5 transition-colors"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Full BRD
          </button>
          <button
            onClick={onClose}
            className="text-[#5b6577] hover:text-[#e6edf7] transition-colors text-[16px] leading-none px-1"
          >
            &times;
          </button>
        </div>
      </div>

      {/* File mismatch banner */}
      {fileMismatch && (
        <div className="px-3 py-2 bg-[#d2992210] border-b border-[#d2992230]">
          <p className="text-[10px] text-[#d29922] leading-relaxed">
            BRD was generated for{' '}
            <button
              onClick={() => onSwitchFile(filePath)}
              className="underline hover:text-[#e6b84d] transition-colors"
            >
              {filePath.split('/').pop()}
            </button>
            . Switch back to see line highlights.
          </p>
        </div>
      )}

      {/* Sections */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(data.sections).map(([key, value]) => (
          <SectionAccordion
            key={key}
            sectionKey={key}
            value={value}
            activeLines={activeLines}
            onNavigateToLines={onNavigateToLines}
          />
        ))}
      </div>
    </div>
  );
}
