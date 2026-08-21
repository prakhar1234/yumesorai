'use client';

import { useMemo } from 'react';
import { DOMAINS, EDGE_TYPES, NODE_TYPES, type GraphData, type GraphNode } from './types';
import { riskColor } from './graphUtils';

interface DetailPanelProps {
  node: GraphNode;
  data: GraphData;
  colorMode: string;
  onClose: () => void;
  onImpact: () => void;
  onPathTrace: () => void;
  onSelectNode: (id: string) => void;
}

export function DetailPanel({ node, data, colorMode, onClose, onImpact, onPathTrace, onSelectNode }: DetailPanelProps) {
  const domain = DOMAINS.find(d => d.id === node.domain);
  const nodeType = NODE_TYPES[node.type];

  const connections = useMemo(() => {
    const outgoing = data.edges
      .filter(e => e.source === node.id)
      .map(e => {
        const target = data.nodes.find(n => n.id === e.target);
        return target ? { node: target, edgeType: e.type, direction: 'out' as const } : null;
      })
      .filter(Boolean) as { node: GraphNode; edgeType: string; direction: 'out' }[];

    const incoming = data.edges
      .filter(e => e.target === node.id)
      .map(e => {
        const source = data.nodes.find(n => n.id === e.source);
        return source ? { node: source, edgeType: e.type, direction: 'in' as const } : null;
      })
      .filter(Boolean) as { node: GraphNode; edgeType: string; direction: 'in' }[];

    return { outgoing, incoming };
  }, [node, data]);

  return (
    <div className="w-72 bg-[#0c1018] border-l border-[#1e2736] overflow-y-auto flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-[#1e2736]">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[13px] font-semibold text-[#e6edf7]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {node.label}
          </span>
          <button onClick={onClose} className="text-[#5b6577] hover:text-white text-sm">✕</button>
        </div>
        <div className="flex items-center gap-2 text-[10.5px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          <span className="px-1.5 py-0.5 rounded bg-[#182233] text-[#9fb0c6]">
            {nodeType?.glyph} {nodeType?.label}
          </span>
          {domain && (
            <span className="px-1.5 py-0.5 rounded" style={{ background: domain.color + '20', color: domain.color }}>
              {domain.name}
            </span>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="p-4 border-b border-[#1e2736]">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="block text-[9px] uppercase tracking-wider text-[#5b6577] mb-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              Risk
            </span>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: riskColor(node.risk) }} />
              <span className="text-[12px] text-[#dbe4f0]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {(node.risk * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider text-[#5b6577] mb-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              LOC
            </span>
            <span className="text-[12px] text-[#dbe4f0]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {node.loc.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider text-[#5b6577] mb-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              Fan-in
            </span>
            <span className="text-[12px] text-[#dbe4f0]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {node.fanIn}
            </span>
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider text-[#5b6577] mb-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              Fan-out
            </span>
            <span className="text-[12px] text-[#dbe4f0]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {node.fanOut}
            </span>
          </div>
        </div>
        {node.dead && (
          <div className="mt-3 px-2 py-1.5 bg-[#2a1215] border border-[#5c2b2e] rounded text-[10px] text-[#ff8a80]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Dead code — no callers detected
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-b border-[#1e2736] flex gap-2">
        <button
          onClick={onImpact}
          className="flex-1 px-2 py-1.5 bg-[#111823] border border-[#232c3c] rounded text-[10px] text-[#9fb0c6] hover:bg-[#182233] transition-colors"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Impact
        </button>
        <button
          onClick={onPathTrace}
          className="flex-1 px-2 py-1.5 bg-[#111823] border border-[#232c3c] rounded text-[10px] text-[#9fb0c6] hover:bg-[#182233] transition-colors"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Path from here
        </button>
      </div>

      {/* Connections */}
      <div className="p-4">
        {/* Outgoing */}
        {connections.outgoing.length > 0 && (
          <div className="mb-4">
            <span className="block text-[9px] uppercase tracking-wider text-[#5b6577] mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              Outgoing ({connections.outgoing.length})
            </span>
            <div className="space-y-1">
              {connections.outgoing.map((conn, i) => (
                <button
                  key={`out-${i}`}
                  onClick={() => onSelectNode(conn.node.id)}
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-[#182233] transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colorMode === 'risk' ? riskColor(conn.node.risk) : conn.node.color }}
                  />
                  <span className="text-[10.5px] text-[#dbe4f0] truncate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {conn.node.label}
                  </span>
                  <span className="text-[9px] text-[#5b6577] ml-auto flex-shrink-0">
                    {EDGE_TYPES[conn.edgeType]?.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Incoming */}
        {connections.incoming.length > 0 && (
          <div>
            <span className="block text-[9px] uppercase tracking-wider text-[#5b6577] mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              Incoming ({connections.incoming.length})
            </span>
            <div className="space-y-1">
              {connections.incoming.map((conn, i) => (
                <button
                  key={`in-${i}`}
                  onClick={() => onSelectNode(conn.node.id)}
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-[#182233] transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colorMode === 'risk' ? riskColor(conn.node.risk) : conn.node.color }}
                  />
                  <span className="text-[10.5px] text-[#dbe4f0] truncate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {conn.node.label}
                  </span>
                  <span className="text-[9px] text-[#5b6577] ml-auto flex-shrink-0">
                    {EDGE_TYPES[conn.edgeType]?.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
