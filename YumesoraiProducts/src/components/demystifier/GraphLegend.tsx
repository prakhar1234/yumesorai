'use client';

import { DOMAINS, EDGE_TYPES, NODE_TYPES } from './types';

interface GraphLegendProps {
  colorMode: string;
  hiddenEdgeTypes: Record<string, boolean>;
  hiddenNodeTypes: Record<string, boolean>;
  onToggleEdgeType: (type: string) => void;
  onToggleNodeType: (type: string) => void;
}

const RISK_LEVELS = [
  { label: 'Critical', min: 0.75, color: '#ef4444' },
  { label: 'High', min: 0.5, color: '#f97316' },
  { label: 'Medium', min: 0.3, color: '#eab308' },
  { label: 'Low', min: 0, color: '#22c55e' },
];

export function GraphLegend({ colorMode, hiddenEdgeTypes, hiddenNodeTypes, onToggleEdgeType, onToggleNodeType }: GraphLegendProps) {
  const colorItems = colorMode === 'risk'
    ? RISK_LEVELS.map(r => ({ color: r.color, label: r.label }))
    : DOMAINS.map(d => ({ color: d.color, label: d.name }));

  return (
    <div className="w-48 bg-[#0c1018] border-l border-[#1e2736] overflow-y-auto flex-shrink-0 p-3">
      {/* Color legend */}
      <div className="mb-4">
        <span
          className="block text-[9px] uppercase tracking-wider text-[#5b6577] mb-2"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {colorMode === 'risk' ? 'Risk Level' : 'Domains'}
        </span>
        <div className="space-y-1.5">
          {colorItems.map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[10.5px] text-[#9fb0c6]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Edge type filters */}
      <div className="mb-4">
        <span
          className="block text-[9px] uppercase tracking-wider text-[#5b6577] mb-2"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Edge Types
        </span>
        <div className="space-y-1">
          {Object.entries(EDGE_TYPES).map(([key, et]) => (
            <button
              key={key}
              onClick={() => onToggleEdgeType(key)}
              className={`flex items-center gap-2 w-full text-left px-1.5 py-1 rounded transition-colors ${
                hiddenEdgeTypes[key] ? 'opacity-40' : 'hover:bg-[#182233]'
              }`}
            >
              <div className="w-4 h-0.5 flex-shrink-0" style={{ backgroundColor: et.color }} />
              <span className="text-[10px] text-[#9fb0c6]">{et.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Node type filters */}
      <div>
        <span
          className="block text-[9px] uppercase tracking-wider text-[#5b6577] mb-2"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Node Types
        </span>
        <div className="space-y-1">
          {Object.entries(NODE_TYPES).map(([key, nt]) => (
            <button
              key={key}
              onClick={() => onToggleNodeType(key)}
              className={`flex items-center gap-2 w-full text-left px-1.5 py-1 rounded transition-colors ${
                hiddenNodeTypes[key] ? 'opacity-40' : 'hover:bg-[#182233]'
              }`}
            >
              <span className="text-[10px] w-3 text-center" style={{ color: hiddenNodeTypes[key] ? '#4a5568' : '#9fb0c6' }}>
                {nt.glyph}
              </span>
              <span className="text-[10px] text-[#9fb0c6]">{nt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
