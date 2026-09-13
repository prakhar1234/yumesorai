'use client';

import { useEffect, useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface BrdSection {
  [key: string]: unknown;
}

export interface BrdData {
  program_id: string;
  program_name: string;
  sections: BrdSection;
}

interface BrdModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  data: BrdData | null;
  filePath: string;
}

interface CodeReference {
  paragraph: string;
  lines: string;
  snippet: string;
}

interface TraceableItemData {
  statement: string;
  code_references: CodeReference[];
}

// ---------------------------------------------------------------------------
// Section label formatting
// ---------------------------------------------------------------------------
const SECTION_LABELS: Record<string, string> = {
  purpose: 'Purpose',
  business_rules: 'Business Rules',
  data_inputs_outputs: 'Data Inputs / Outputs',
  processing_logic: 'Processing Logic',
  dependencies: 'Dependencies',
  error_handling: 'Error Handling',
  downstream_effects: 'Downstream Effects',
};

function formatSectionKey(key: string): string {
  return SECTION_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// COBOL syntax highlighting (local copy — same logic as ReviewWorkspace)
// ---------------------------------------------------------------------------
function highlightCobolLine(line: string): JSX.Element {
  const trimmed = line.trimStart();

  if (line.length >= 7 && line[6] === '*') {
    return <span style={{ color: '#57634f' }}>{line}</span>;
  }
  if (trimmed.startsWith('//')) {
    return <span style={{ color: '#c9a56a' }}>{line}</span>;
  }
  if (trimmed.includes('EXEC SQL') || trimmed.includes('END-EXEC') ||
      trimmed.includes('INSERT INTO') || trimmed.includes('UPDATE ') ||
      trimmed.includes('SELECT ') || trimmed.includes('DELETE ') ||
      trimmed.includes('VALUES') || trimmed.includes('WHERE ') ||
      trimmed.includes('SET ') || trimmed.includes('INTO :') ||
      trimmed.includes('FROM ')) {
    return <span style={{ color: '#58b0ff' }}>{line}</span>;
  }
  if (trimmed.includes('ANBX') || trimmed.includes("CALL 'ANBX")) {
    return <span style={{ color: '#d29922' }}>{line}</span>;
  }
  if (trimmed.includes('DIVISION') || trimmed.includes('SECTION') ||
      trimmed.startsWith('COPY ') || trimmed.includes('PROGRAM-ID') ||
      trimmed.includes('EXEC CICS')) {
    return <span style={{ color: '#7de0cf' }}>{line}</span>;
  }
  return <span style={{ color: '#9fb0c6' }}>{line}</span>;
}

// ---------------------------------------------------------------------------
// Type guard for traceable items
// ---------------------------------------------------------------------------
function isTraceableItem(item: unknown): item is TraceableItemData {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.statement === 'string' && Array.isArray(obj.code_references);
}

function isTraceableArray(value: unknown): value is TraceableItemData[] {
  return Array.isArray(value) && value.length > 0 && isTraceableItem(value[0]);
}

// ---------------------------------------------------------------------------
// TraceableItem — statement + collapsible code traces
// ---------------------------------------------------------------------------
function TraceableItem({ item, index }: { item: TraceableItemData; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasRefs = item.code_references && item.code_references.length > 0;

  return (
    <li className="text-[12px] text-[#dbe4f0] leading-relaxed">
      <div className="flex items-start gap-2">
        <span className="flex-1">{item.statement}</span>
        {hasRefs && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 text-[10px] text-[#45c4b0] hover:text-[#7de0cf] bg-[#45c4b010] hover:bg-[#45c4b020] border border-[#45c4b030] rounded px-2 py-0.5 transition-colors mt-0.5"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {expanded ? '^ Hide' : 'Trace'}
          </button>
        )}
      </div>
      {expanded && hasRefs && (
        <div className="ml-0 mt-1 mb-2 space-y-2">
          {item.code_references.map((cr, j) => (
            <CodeTraceBlock key={`${index}-${j}`} codeRef={cr} />
          ))}
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// CodeTraceBlock — renders a single code reference (paragraph + snippet)
// ---------------------------------------------------------------------------
function CodeTraceBlock({ codeRef }: { codeRef: CodeReference }) {
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-block text-[9px] text-[#d29922] bg-[#d2992215] border border-[#d2992230] rounded px-1.5 py-0.5"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {codeRef.paragraph}
        </span>
        {codeRef.lines && (
          <span className="text-[9px] text-[#5b6577]">
            lines {codeRef.lines}
          </span>
        )}
      </div>
      <pre
        className="bg-[#080c12] border border-[#1e2736] rounded p-3 overflow-x-auto text-[11px] leading-[1.6]"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        {codeRef.snippet.split('\n').map((line, i) => (
          <div key={i}>{highlightCobolLine(line)}</div>
        ))}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Render a section value (string, array, or object) — with traceable support
// ---------------------------------------------------------------------------
function renderValue(value: unknown): JSX.Element {
  if (typeof value === 'string') {
    return (
      <p className="text-[12px] text-[#dbe4f0] leading-relaxed whitespace-pre-wrap">
        {value}
      </p>
    );
  }

  // Traceable items array (new structured format)
  if (isTraceableArray(value)) {
    return (
      <ul className="list-disc list-inside space-y-2">
        {value.map((item, i) => (
          <TraceableItem key={i} item={item} index={i} />
        ))}
      </ul>
    );
  }

  // Plain array (backward compatibility)
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc list-inside space-y-1">
        {value.map((item, i) => (
          <li key={i} className="text-[12px] text-[#dbe4f0] leading-relaxed">
            {typeof item === 'string'
              ? item
              : isTraceableItem(item)
                ? <TraceableItem item={item} index={i} />
                : JSON.stringify(item)}
          </li>
        ))}
      </ul>
    );
  }

  // Object (e.g. data_inputs_outputs with inputs/outputs sub-keys)
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    return (
      <div className="space-y-3">
        {Object.entries(obj).map(([k, v]) => (
          <div key={k}>
            <span
              className="text-[10px] text-[#7a869a] uppercase tracking-wider block mb-1"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {k.replace(/_/g, ' ')}
            </span>
            {renderValue(v)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <p className="text-[12px] text-[#dbe4f0]">{String(value)}</p>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function BrdModal({ open, onClose, loading, error, data, filePath }: BrdModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#0c1018] border border-[#1e2736] rounded-xl shadow-2xl flex flex-col"
        style={{
          width: '90vw',
          height: '90vh',
          maxWidth: '1100px',
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2736] shrink-0">
          <div>
            <h2 className="text-[14px] font-semibold text-[#e6edf7]">
              Business Requirements Document
            </h2>
            <p className="text-[11px] text-[#5b6577] mt-0.5">
              {filePath}
              {data && (
                <span className="ml-3 text-[#45c4b0]">{data.program_id}</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#5b6577] hover:text-[#e6edf7] transition-colors text-[18px] leading-none px-2 py-1"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-8 h-8 border-3 border-[#45c4b0] border-t-transparent rounded-full animate-spin" />
              <p className="text-[12px] text-[#7a869a]">
                Generating full-program BRD...
              </p>
              <p className="text-[11px] text-[#5b6577] max-w-md text-center leading-relaxed">
                The LLM is analyzing the entire program including identification, data division,
                procedure division, SQL statements, and external calls. This may take a moment.
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex items-center justify-center h-full">
              <div className="bg-[#ef444420] border border-[#ef4444] rounded-lg p-5 max-w-lg">
                <p className="text-[12px] text-[#ef4444] font-semibold mb-1">
                  BRD Generation Failed
                </p>
                <p className="text-[11px] text-[#ef9a9a] leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* BRD Content */}
          {!loading && !error && data && (
            <div className="space-y-4">
              {/* Program header card */}
              <div className="bg-[#0a0e14] border border-[#1e2736] rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[13px] font-semibold text-[#e6edf7]">
                    {data.program_id}
                  </span>
                  <span className="text-[10px] text-[#5b6577]">
                    {data.program_name}
                  </span>
                </div>
                <p className="text-[11px] text-[#7a869a]">
                  Auto-generated Business Requirements Document from COBOL source analysis.
                </p>
              </div>

              {/* Section cards */}
              {Object.entries(data.sections).map(([key, value]) => (
                <div
                  key={key}
                  className="bg-[#0a0e14] border border-[#1e2736] rounded-lg p-4"
                >
                  <span
                    className="inline-block text-[10px] text-[#45c4b0] uppercase tracking-wider bg-[#45c4b015] border border-[#45c4b030] rounded px-2 py-0.5 mb-3"
                  >
                    {formatSectionKey(key)}
                  </span>
                  {renderValue(value)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
