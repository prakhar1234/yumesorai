'use client';

import { useMemo, useEffect, useRef } from 'react';
import { EDGE_TYPES, type GraphData, type GraphNode } from './types';

interface SourcePreviewPopupProps {
  node: GraphNode;
  data: GraphData;
  sourceContent: string;
  onClose: () => void;
}

interface HighlightMatch {
  lineIndex: number;
  edgeType: string;
  targetLabel: string;
}

export function SourcePreviewPopup({ node, data, sourceContent, onClose }: SourcePreviewPopupProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstHighlightRef = useRef<HTMLDivElement>(null);

  // Compute highlights based on edges
  const highlights = useMemo(() => {
    const lines = sourceContent.split('\n');
    const matches: HighlightMatch[] = [];

    // Outgoing edges from this node
    const outEdges = data.edges.filter(e => e.source === node.id);
    // Incoming edges to this node
    const inEdges = data.edges.filter(e => e.target === node.id);

    const targetNodes: Record<string, GraphNode> = {};
    data.nodes.forEach(n => { targetNodes[n.id] = n; });

    outEdges.forEach(edge => {
      const target = targetNodes[edge.target];
      if (!target) return;
      const targetName = target.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      let pattern: RegExp | null = null;
      switch (edge.type) {
        case 'call':
          pattern = new RegExp(`\\bCALL\\s+['"]${targetName}['"]`, 'i');
          break;
        case 'copy':
          pattern = new RegExp(`\\bCOPY\\s+['"]?${targetName}['"]?`, 'i');
          break;
        case 'data':
          pattern = new RegExp(`(FROM|INTO|UPDATE)\\s+${targetName}|SELECT.*ASSIGN.*${targetName}`, 'i');
          break;
        case 'screen':
          pattern = new RegExp(`(SEND|RECEIVE)\\s+MAP.*${targetName}`, 'i');
          break;
      }

      if (pattern) {
        lines.forEach((line, idx) => {
          if (pattern!.test(line)) {
            matches.push({ lineIndex: idx, edgeType: edge.type, targetLabel: target.label });
          }
        });
      }
    });

    inEdges.forEach(edge => {
      const source = targetNodes[edge.source];
      if (!source) return;
      const nodeName = node.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      if (edge.type === 'job') {
        const pattern = new RegExp(`EXEC\\s+PGM=${nodeName}`, 'i');
        lines.forEach((line, idx) => {
          if (pattern.test(line)) {
            matches.push({ lineIndex: idx, edgeType: edge.type, targetLabel: source.label });
          }
        });
      }
    });

    return matches;
  }, [node, data, sourceContent]);

  // Map line indices to highlight info for fast lookup
  const highlightMap = useMemo(() => {
    const map: Record<number, HighlightMatch[]> = {};
    highlights.forEach(h => {
      if (!map[h.lineIndex]) map[h.lineIndex] = [];
      map[h.lineIndex].push(h);
    });
    return map;
  }, [highlights]);

  // Active edge types in the highlights
  const activeEdgeTypes = useMemo(() => {
    const types = new Set<string>();
    highlights.forEach(h => types.add(h.edgeType));
    return Array.from(types);
  }, [highlights]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Scroll to first highlight after render
  useEffect(() => {
    if (firstHighlightRef.current) {
      firstHighlightRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [highlights]);

  const lines = sourceContent.split('\n');

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative w-[85vw] max-w-5xl h-[80vh] bg-[#0c1018] border border-[#1e2736] rounded-xl shadow-2xl flex flex-col"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2736]">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-semibold text-[#e6edf7]">
              {node.label}
            </span>
            <span className="text-[10px] text-[#5b6577] px-2 py-0.5 bg-[#182233] rounded">
              {lines.length} lines
            </span>
            {highlights.length > 0 && (
              <span className="text-[10px] text-[#f97316] px-2 py-0.5 bg-[#f9731618] rounded">
                {highlights.length} match{highlights.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#5b6577] hover:text-white text-lg leading-none px-2"
          >
            ✕
          </button>
        </div>

        {/* Legend */}
        {activeEdgeTypes.length > 0 && (
          <div className="flex items-center gap-4 px-5 py-2 border-b border-[#1e2736]">
            <span className="text-[9px] uppercase tracking-wider text-[#5b6577]">Highlights:</span>
            {activeEdgeTypes.map(type => (
              <span key={type} className="flex items-center gap-1.5 text-[10px]">
                <span
                  className="inline-block w-3 h-1.5 rounded-sm"
                  style={{ backgroundColor: EDGE_TYPES[type]?.color || '#666' }}
                />
                <span style={{ color: EDGE_TYPES[type]?.color || '#aeb9c9' }}>
                  {EDGE_TYPES[type]?.label || type}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Source code */}
        <div className="flex-1 overflow-auto">
          <pre className="text-[11px] leading-[1.6]">
            {lines.map((line, idx) => {
              const hl = highlightMap[idx];
              const isHighlighted = !!hl;
              const isFirstHighlight = isHighlighted && highlights.indexOf(hl[0]) === 0;
              const edgeColor = hl?.[0] ? (EDGE_TYPES[hl[0].edgeType]?.color || '#666') : undefined;

              return (
                <div
                  key={idx}
                  ref={isFirstHighlight ? firstHighlightRef : undefined}
                  className="flex hover:bg-[#ffffff06]"
                  style={isHighlighted ? {
                    backgroundColor: edgeColor + '14',
                    borderLeft: `3px solid ${edgeColor}`,
                  } : {
                    borderLeft: '3px solid transparent',
                  }}
                >
                  <span className="select-none text-right pr-4 pl-4 text-[#3a4252] w-14 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className={isHighlighted ? 'text-[#e6edf7]' : 'text-[#9fb0c6]'}>
                    {line || '\u00A0'}
                  </span>
                  {hl && (
                    <span className="ml-4 text-[9px] flex-shrink-0 self-center" style={{ color: edgeColor }}>
                      {hl.map(h => `→ ${h.targetLabel}`).join(', ')}
                    </span>
                  )}
                </div>
              );
            })}
          </pre>
        </div>
      </div>
    </div>
  );
}
