'use client';

import { useEffect, useCallback, useState } from 'react';
import { jsPDF } from 'jspdf';

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

export interface CodeReference {
  paragraph: string;
  lines: string;
  snippet: string;
}

export interface TraceableItemData {
  statement: string;
  code_references: CodeReference[];
}

// ---------------------------------------------------------------------------
// Section label formatting
// ---------------------------------------------------------------------------
export const SECTION_LABELS: Record<string, string> = {
  purpose: 'Purpose',
  business_rules: 'Business Rules',
  data_inputs_outputs: 'Data Inputs / Outputs',
  processing_logic: 'Processing Logic',
  dependencies: 'Dependencies',
  error_handling: 'Error Handling',
  downstream_effects: 'Downstream Effects',
};

export function formatSectionKey(key: string): string {
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
export function isTraceableItem(item: unknown): item is TraceableItemData {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.statement === 'string' && Array.isArray(obj.code_references);
}

export function isTraceableArray(value: unknown): value is TraceableItemData[] {
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
// ---------------------------------------------------------------------------
// Convert BRD data to Markdown for download
// ---------------------------------------------------------------------------
function brdToMarkdown(data: BrdData, filePath: string): string {
  const lines: string[] = [];
  lines.push(`# Business Requirements Document`);
  lines.push('');
  lines.push(`**Program ID:** ${data.program_id}`);
  lines.push(`**Program Name:** ${data.program_name}`);
  lines.push(`**Source File:** ${filePath}`);
  lines.push(`**Generated:** ${new Date().toISOString().split('T')[0]}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const [key, value] of Object.entries(data.sections)) {
    const label = formatSectionKey(key);
    lines.push(`## ${label}`);
    lines.push('');
    renderValueToMarkdown(value, lines, 0);
    lines.push('');
  }

  return lines.join('\n');
}

function renderValueToMarkdown(value: unknown, lines: string[], depth: number): void {
  if (typeof value === 'string') {
    lines.push(value);
    lines.push('');
    return;
  }

  if (isTraceableArray(value)) {
    for (const item of value) {
      lines.push(`- ${item.statement}`);
      if (item.code_references && item.code_references.length > 0) {
        for (const cr of item.code_references) {
          lines.push(`  - **${cr.paragraph}** (lines ${cr.lines})`);
          if (cr.snippet) {
            lines.push('    ```cobol');
            for (const sl of cr.snippet.split('\n')) {
              lines.push(`    ${sl}`);
            }
            lines.push('    ```');
          }
        }
      }
    }
    lines.push('');
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') {
        lines.push(`- ${item}`);
      } else if (isTraceableItem(item)) {
        lines.push(`- ${item.statement}`);
        if (item.code_references && item.code_references.length > 0) {
          for (const cr of item.code_references) {
            lines.push(`  - **${cr.paragraph}** (lines ${cr.lines})`);
            if (cr.snippet) {
              lines.push('    ```cobol');
              for (const sl of cr.snippet.split('\n')) {
                lines.push(`    ${sl}`);
              }
              lines.push('    ```');
            }
          }
        }
      } else {
        lines.push(`- ${JSON.stringify(item)}`);
      }
    }
    lines.push('');
    return;
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      const subLabel = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      lines.push(`### ${subLabel}`);
      lines.push('');
      renderValueToMarkdown(v, lines, depth + 1);
    }
    return;
  }

  lines.push(String(value));
  lines.push('');
}

// ---------------------------------------------------------------------------
// Convert BRD data to PDF for download
// ---------------------------------------------------------------------------
const PDF_PAGE_WIDTH = 210;
const PDF_PAGE_HEIGHT = 297;
const PDF_MARGIN_LEFT = 20;
const PDF_MARGIN_RIGHT = 20;
const PDF_MARGIN_TOP = 25;
const PDF_MARGIN_BOTTOM = 20;
const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - PDF_MARGIN_LEFT - PDF_MARGIN_RIGHT;
const PDF_LINE_HEIGHT = 6;
const PDF_CODE_LINE_HEIGHT = 4.5;

function checkPageBreak(doc: jsPDF, y: number, needed: number = PDF_LINE_HEIGHT): number {
  if (y + needed > PDF_PAGE_HEIGHT - PDF_MARGIN_BOTTOM) {
    doc.addPage();
    return PDF_MARGIN_TOP;
  }
  return y;
}

function renderValueToPdf(
  value: unknown,
  doc: jsPDF,
  y: number,
  x: number = PDF_MARGIN_LEFT,
): number {
  const maxWidth = PDF_PAGE_WIDTH - x - PDF_MARGIN_RIGHT;

  // String
  if (typeof value === 'string') {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(value, maxWidth);
    for (const line of lines) {
      y = checkPageBreak(doc, y, PDF_LINE_HEIGHT);
      doc.text(line, x, y);
      y += PDF_LINE_HEIGHT;
    }
    y += 2;
    return y;
  }

  // Traceable items array
  if (isTraceableArray(value)) {
    for (const item of value) {
      y = checkPageBreak(doc, y, PDF_LINE_HEIGHT);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      const bulletLines = doc.splitTextToSize(`• ${item.statement}`, maxWidth - 4);
      for (const bl of bulletLines) {
        y = checkPageBreak(doc, y, PDF_LINE_HEIGHT);
        doc.text(bl, x + 2, y);
        y += PDF_LINE_HEIGHT;
      }
      // Code references
      if (item.code_references && item.code_references.length > 0) {
        for (const cr of item.code_references) {
          y = checkPageBreak(doc, y, PDF_LINE_HEIGHT);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`${cr.paragraph} (lines ${cr.lines})`, x + 6, y);
          y += PDF_CODE_LINE_HEIGHT + 1;
          if (cr.snippet) {
            const snippetLines = cr.snippet.split('\n');
            const blockHeight = snippetLines.length * PDF_CODE_LINE_HEIGHT + 4;
            y = checkPageBreak(doc, y, blockHeight);
            // Background rectangle
            doc.setFillColor(245, 245, 245);
            doc.rect(x + 6, y - 3, maxWidth - 8, blockHeight, 'F');
            doc.setFont('courier', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(50, 50, 50);
            for (const sl of snippetLines) {
              y = checkPageBreak(doc, y, PDF_CODE_LINE_HEIGHT);
              const truncated = sl.length > 100 ? sl.substring(0, 100) + '...' : sl;
              doc.text(truncated, x + 8, y);
              y += PDF_CODE_LINE_HEIGHT;
            }
            y += 3;
          }
        }
      }
      y += 1;
    }
    return y;
  }

  // Plain array
  if (Array.isArray(value)) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    for (const item of value) {
      const text = typeof item === 'string'
        ? item
        : isTraceableItem(item)
          ? item.statement
          : JSON.stringify(item);
      const bulletLines = doc.splitTextToSize(`• ${text}`, maxWidth - 4);
      for (const bl of bulletLines) {
        y = checkPageBreak(doc, y, PDF_LINE_HEIGHT);
        doc.text(bl, x + 2, y);
        y += PDF_LINE_HEIGHT;
      }
    }
    y += 2;
    return y;
  }

  // Object (sub-sections)
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      const subLabel = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      y = checkPageBreak(doc, y, 10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(subLabel, x + 2, y);
      y += PDF_LINE_HEIGHT + 2;
      y = renderValueToPdf(v, doc, y, x + 2);
    }
    return y;
  }

  // Fallback
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  const fallbackLines = doc.splitTextToSize(String(value), maxWidth);
  for (const line of fallbackLines) {
    y = checkPageBreak(doc, y, PDF_LINE_HEIGHT);
    doc.text(line, x, y);
    y += PDF_LINE_HEIGHT;
  }
  return y;
}

function brdToPdf(data: BrdData, filePath: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = PDF_MARGIN_TOP;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text('Business Requirements Document', PDF_MARGIN_LEFT, y);
  y += 12;

  // Metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Program ID: ${data.program_id}`, PDF_MARGIN_LEFT, y);
  y += PDF_LINE_HEIGHT;
  doc.text(`Program Name: ${data.program_name}`, PDF_MARGIN_LEFT, y);
  y += PDF_LINE_HEIGHT;
  doc.text(`Source File: ${filePath}`, PDF_MARGIN_LEFT, y);
  y += PDF_LINE_HEIGHT;
  doc.text(`Generated: ${new Date().toISOString().split('T')[0]}`, PDF_MARGIN_LEFT, y);
  y += 10;

  // Horizontal rule
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(PDF_MARGIN_LEFT, y, PDF_PAGE_WIDTH - PDF_MARGIN_RIGHT, y);
  y += 8;

  // Sections
  for (const [key, value] of Object.entries(data.sections)) {
    const label = formatSectionKey(key);
    y = checkPageBreak(doc, y, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text(label, PDF_MARGIN_LEFT, y);
    y += 8;
    y = renderValueToPdf(value, doc, y, PDF_MARGIN_LEFT);
    y += 4;
  }

  doc.save(`BRD_${data.program_id}.pdf`);
}

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

  const handleDownload = useCallback(() => {
    if (!data) return;
    const md = brdToMarkdown(data, filePath);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BRD_${data.program_id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data, filePath]);

  const handleDownloadPdf = useCallback(() => {
    if (!data) return;
    brdToPdf(data, filePath);
  }, [data, filePath]);

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
          <div className="flex items-center gap-2">
            {data && !loading && !error && (
              <>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 text-[11px] text-[#9fb0c6] hover:text-[#e6edf7] bg-[#111823] hover:bg-[#182233] border border-[#1e2736] rounded-md px-3 py-1.5 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10" />
                  </svg>
                  Download MD
                </button>
                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-1.5 text-[11px] text-[#9fb0c6] hover:text-[#e6edf7] bg-[#111823] hover:bg-[#182233] border border-[#1e2736] rounded-md px-3 py-1.5 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 1h8l4 4v10H2V1z" />
                    <path d="M10 1v4h4" />
                    <path d="M5 9h6M5 12h4" />
                  </svg>
                  Download PDF
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-[#5b6577] hover:text-[#e6edf7] transition-colors text-[18px] leading-none px-2 py-1"
            >
              &times;
            </button>
          </div>
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
