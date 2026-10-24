'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { DetailPanel } from './DetailPanel';
import {
  ARCH_LAYERS, EDGE_TYPES, NODE_TYPES,
  type GraphData, type GraphNode, type CoverageData, type ArchLayer,
} from './types';
import {
  groupNodesByLayer, computeInterZoneEdges, computeLayerMetrics,
  riskColor, nodeRadius, classifyLayer,
  computeImpact, findPath, buildAdjacency,
} from './graphUtils';

interface ArchitectureViewProps {
  data: GraphData;
  repoLabel: string;
  search: string;
  onNewAnalysis: () => void;
  onSwitchToGraph: () => void;
  coverage?: CoverageData | null;
  sources?: Record<string, string>;
  onViewSource?: (nodeId: string) => void;
}

type ColorMode = 'domain' | 'risk';

const SVG_NS = 'http://www.w3.org/2000/svg';
const LAYER_ORDER: ArchLayer[] = ['frontend', 'backend', 'scheduler'];
const ZONE_W = 440;
const ZONE_GAP = 80;
const ZONE_PAD = 30;
const ZONE_HEADER = 60;
const NODE_CELL = 48;

export function ArchitectureView({
  data, repoLabel, search, onNewAnalysis, onSwitchToGraph, coverage,
  sources, onViewSource,
}: ArchitectureViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>('domain');
  const [toast, setToast] = useState<string | null>(null);

  const viewT = useRef({ x: 0, y: 0, k: 1 });
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; startTx: number; startTy: number } | null>(null);

  const { adjOut, adjIn } = useMemo(() => buildAdjacency(data), [data]);
  const byId = useMemo(() => {
    const map: Record<string, GraphNode> = {};
    data.nodes.forEach(n => { map[n.id] = n; });
    return map;
  }, [data]);

  const layerGroups = useMemo(() => groupNodesByLayer(data), [data]);
  const interZoneEdges = useMemo(() => computeInterZoneEdges(data), [data]);
  const layerMetrics = useMemo(() => {
    const m: Record<ArchLayer, ReturnType<typeof computeLayerMetrics>> = {} as Record<ArchLayer, ReturnType<typeof computeLayerMetrics>>;
    LAYER_ORDER.forEach(l => { m[l] = computeLayerMetrics(layerGroups[l]); });
    return m;
  }, [layerGroups]);

  // Aggregate inter-zone edges by (sourceLayer, targetLayer) for rendering
  const aggregatedEdges = useMemo(() => {
    const map: Record<string, { sourceLayer: ArchLayer; targetLayer: ArchLayer; count: number; types: Record<string, number> }> = {};
    interZoneEdges.forEach(e => {
      const key = `${e.sourceLayer}>${e.targetLayer}`;
      if (!map[key]) {
        map[key] = { sourceLayer: e.sourceLayer, targetLayer: e.targetLayer, count: 0, types: {} };
      }
      map[key].count += e.count;
      map[key].types[e.edgeType] = (map[key].types[e.edgeType] || 0) + e.count;
    });
    return Object.values(map);
  }, [interZoneEdges]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const getNodeColor = useCallback((n: GraphNode) => {
    return colorMode === 'risk' ? riskColor(n.risk) : n.color;
  }, [colorMode]);

  const applyTransform = useCallback(() => {
    if (gRef.current) {
      const t = viewT.current;
      gRef.current.setAttribute('transform', `translate(${t.x},${t.y}) scale(${t.k})`);
    }
  }, []);

  const fitView = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const totalW = LAYER_ORDER.length * ZONE_W + (LAYER_ORDER.length - 1) * ZONE_GAP;
    const maxNodes = Math.max(...LAYER_ORDER.map(l => layerGroups[l].length), 1);
    const cols = Math.max(Math.ceil(Math.sqrt(maxNodes * 1.5)), 3);
    const rows = Math.ceil(maxNodes / cols);
    const totalH = ZONE_HEADER + ZONE_PAD * 2 + rows * NODE_CELL + 40;
    const pad = 60;
    const k = Math.min(rect.width / (totalW + pad * 2), rect.height / (totalH + pad * 2), 1.3);
    viewT.current = {
      x: (rect.width - totalW * k) / 2,
      y: (rect.height - totalH * k) / 2,
      k,
    };
    applyTransform();
  }, [layerGroups, applyTransform]);

  const renderSVG = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const g = document.createElementNS(SVG_NS, 'g');
    svg.appendChild(g);
    gRef.current = g;
    applyTransform();

    const searchLower = search.toLowerCase();

    // Compute zone positions
    const zoneRects: Record<ArchLayer, { x: number; y: number; w: number; h: number; cx: number; cy: number }> = {} as Record<ArchLayer, { x: number; y: number; w: number; h: number; cx: number; cy: number }>;
    let maxH = 0;

    LAYER_ORDER.forEach((layer, i) => {
      const nodes = layerGroups[layer];
      const cols = Math.max(Math.ceil(Math.sqrt(nodes.length * 1.5)), 3);
      const rows = Math.ceil(nodes.length / cols);
      const zoneH = ZONE_HEADER + ZONE_PAD * 2 + Math.max(rows, 1) * NODE_CELL + 20;
      if (zoneH > maxH) maxH = zoneH;
      const x = i * (ZONE_W + ZONE_GAP);
      zoneRects[layer] = { x, y: 0, w: ZONE_W, h: zoneH, cx: x + ZONE_W / 2, cy: zoneH / 2 };
    });

    // Normalize heights
    LAYER_ORDER.forEach(layer => {
      zoneRects[layer].h = maxH;
      zoneRects[layer].cy = maxH / 2;
    });

    // Draw zones
    LAYER_ORDER.forEach(layer => {
      const r = zoneRects[layer];
      const cfg = ARCH_LAYERS[layer];
      const metrics = layerMetrics[layer];

      // Zone background
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(r.x));
      rect.setAttribute('y', String(r.y));
      rect.setAttribute('width', String(r.w));
      rect.setAttribute('height', String(r.h));
      rect.setAttribute('rx', '12');
      rect.setAttribute('fill', cfg.bgColor);
      rect.setAttribute('stroke', cfg.color + '40');
      rect.setAttribute('stroke-width', '1.5');
      g.appendChild(rect);

      // Zone header
      const header = document.createElementNS(SVG_NS, 'text');
      header.setAttribute('x', String(r.x + 20));
      header.setAttribute('y', String(r.y + 28));
      header.setAttribute('font-size', '14');
      header.setAttribute('font-weight', '600');
      header.setAttribute('font-family', "'IBM Plex Mono', monospace");
      header.setAttribute('fill', cfg.color);
      header.textContent = `${cfg.icon} ${cfg.label}`;
      g.appendChild(header);

      // Zone metrics subtitle
      const sub = document.createElementNS(SVG_NS, 'text');
      sub.setAttribute('x', String(r.x + 20));
      sub.setAttribute('y', String(r.y + 46));
      sub.setAttribute('font-size', '10');
      sub.setAttribute('font-family', "'IBM Plex Mono', monospace");
      sub.setAttribute('fill', '#5b6577');
      const typeSummary = Object.entries(metrics.byType).map(([t, c]) => `${c} ${NODE_TYPES[t]?.label || t}`).join(', ');
      sub.textContent = `${metrics.nodeCount} nodes · ${(metrics.totalLoc / 1000).toFixed(1)}k LOC · ${typeSummary}`;
      g.appendChild(sub);

      // Avg risk badge on the right
      const riskBadge = document.createElementNS(SVG_NS, 'text');
      riskBadge.setAttribute('x', String(r.x + r.w - 20));
      riskBadge.setAttribute('y', String(r.y + 28));
      riskBadge.setAttribute('text-anchor', 'end');
      riskBadge.setAttribute('font-size', '11');
      riskBadge.setAttribute('font-family', "'IBM Plex Mono', monospace");
      riskBadge.setAttribute('fill', riskColor(metrics.avgRisk));
      riskBadge.textContent = `${(metrics.avgRisk * 100).toFixed(0)}% avg risk`;
      g.appendChild(riskBadge);

      // Draw nodes in grid
      const nodes = layerGroups[layer];
      const cols = Math.max(Math.ceil(Math.sqrt(nodes.length * 1.5)), 3);
      nodes.forEach((n, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const nx = r.x + ZONE_PAD + col * NODE_CELL + NODE_CELL / 2;
        const ny = r.y + ZONE_HEADER + ZONE_PAD + row * NODE_CELL + NODE_CELL / 2;

        const ng = document.createElementNS(SVG_NS, 'g');
        ng.setAttribute('transform', `translate(${nx},${ny})`);
        ng.style.cursor = 'pointer';

        let opacity = '1';
        if (searchLower && !n.label.toLowerCase().includes(searchLower)) {
          opacity = '0.15';
        }
        ng.setAttribute('opacity', opacity);

        const rad = nodeRadius(n);
        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('r', String(rad));
        circle.setAttribute('fill', getNodeColor(n));
        circle.setAttribute('stroke', selected === n.id ? '#fff' : '#0a0e14');
        circle.setAttribute('stroke-width', selected === n.id ? '2.2' : '1.2');
        ng.appendChild(circle);

        if (n.dead) {
          const deadMark = document.createElementNS(SVG_NS, 'circle');
          deadMark.setAttribute('r', String(rad + 3));
          deadMark.setAttribute('fill', 'none');
          deadMark.setAttribute('stroke', '#ef4444');
          deadMark.setAttribute('stroke-width', '1');
          deadMark.setAttribute('stroke-dasharray', '3,3');
          ng.appendChild(deadMark);
        }

        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', '0');
        text.setAttribute('y', String(rad + 12));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '8.5');
        text.setAttribute('font-family', "'IBM Plex Mono', monospace");
        text.setAttribute('fill', selected === n.id ? '#fff' : '#aeb9c9');
        text.textContent = n.label.length > 8 ? n.label.substring(0, 7) + '\u2026' : n.label;
        ng.appendChild(text);

        ng.addEventListener('mousedown', (ev: MouseEvent) => {
          ev.stopPropagation();
          setSelected(n.id);
        });

        g.appendChild(ng);
      });
    });

    // Draw inter-zone edges as curved paths
    aggregatedEdges.forEach(agg => {
      const src = zoneRects[agg.sourceLayer];
      const tgt = zoneRects[agg.targetLayer];
      if (!src || !tgt) return;

      const srcIdx = LAYER_ORDER.indexOf(agg.sourceLayer);
      const tgtIdx = LAYER_ORDER.indexOf(agg.targetLayer);

      let x1: number, x2: number;
      if (srcIdx < tgtIdx) {
        x1 = src.x + src.w;
        x2 = tgt.x;
      } else {
        x1 = src.x;
        x2 = tgt.x + tgt.w;
      }

      // Offset y slightly for each edge to avoid overlap
      const edgeIdx = aggregatedEdges.indexOf(agg);
      const yOffset = (edgeIdx - aggregatedEdges.length / 2) * 20;
      const y1 = src.cy + yOffset;
      const y2 = tgt.cy + yOffset;

      const midX = (x1 + x2) / 2;
      const cpOff = Math.abs(x2 - x1) * 0.3;

      const path = document.createElementNS(SVG_NS, 'path');
      const d = `M${x1},${y1} C${x1 + (srcIdx < tgtIdx ? cpOff : -cpOff)},${y1} ${x2 + (srcIdx < tgtIdx ? -cpOff : cpOff)},${y2} ${x2},${y2}`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');

      // Use dominant edge type color
      const dominantType = Object.entries(agg.types).sort((a, b) => b[1] - a[1])[0]?.[0] || 'call';
      path.setAttribute('stroke', EDGE_TYPES[dominantType]?.color || '#666');
      path.setAttribute('stroke-width', String(Math.min(6, 1 + Math.log2(agg.count + 1))));
      path.setAttribute('stroke-opacity', '0.5');
      g.appendChild(path);

      // Count label
      const labelX = midX;
      const labelY = (y1 + y2) / 2 - 8;

      const bg = document.createElementNS(SVG_NS, 'rect');
      bg.setAttribute('x', String(labelX - 24));
      bg.setAttribute('y', String(labelY - 10));
      bg.setAttribute('width', '48');
      bg.setAttribute('height', '16');
      bg.setAttribute('rx', '4');
      bg.setAttribute('fill', '#111823');
      bg.setAttribute('stroke', '#232c3c');
      bg.setAttribute('stroke-width', '0.5');
      g.appendChild(bg);

      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', String(labelX));
      label.setAttribute('y', String(labelY + 2));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '9');
      label.setAttribute('font-family', "'IBM Plex Mono', monospace");
      label.setAttribute('fill', EDGE_TYPES[dominantType]?.color || '#aeb9c9');

      const typeLabels = Object.entries(agg.types)
        .sort((a, b) => b[1] - a[1])
        .map(([, c]) => c);
      label.textContent = `${agg.count} ${dominantType}${agg.count !== 1 ? 's' : ''}`;
      g.appendChild(label);
    });

    // SVG event listeners for pan/zoom
    svg.onmousedown = (ev: MouseEvent) => {
      if (ev.target === svg || (ev.target as Element)?.tagName === 'svg') {
        dragState.current = {
          dragging: false,
          startX: ev.clientX,
          startY: ev.clientY,
          startTx: viewT.current.x,
          startTy: viewT.current.y,
        };
      }
    };

    svg.onmousemove = (ev: MouseEvent) => {
      const ds = dragState.current;
      if (!ds) return;
      const dx = ev.clientX - ds.startX;
      const dy = ev.clientY - ds.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) ds.dragging = true;
      if (!ds.dragging) return;
      viewT.current.x = ds.startTx + dx;
      viewT.current.y = ds.startTy + dy;
      applyTransform();
    };

    svg.onmouseup = () => {
      const ds = dragState.current;
      if (ds && !ds.dragging) {
        setSelected(null);
      }
      dragState.current = null;
    };

    svg.onwheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const rect = svg.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const t = viewT.current;
      const factor = ev.deltaY > 0 ? 0.9 : 1.1;
      const newK = Math.max(0.1, Math.min(5, t.k * factor));
      t.x = mx - (mx - t.x) * (newK / t.k);
      t.y = my - (my - t.y) * (newK / t.k);
      t.k = newK;
      applyTransform();
    };
  }, [data, layerGroups, layerMetrics, aggregatedEdges, selected, colorMode, search, getNodeColor, applyTransform]);

  useEffect(() => {
    fitView();
    renderSVG();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    renderSVG();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, colorMode, search]);

  // Impact / Path handlers for DetailPanel
  const handleImpact = useCallback(() => {
    if (!selected) return;
    const impact = computeImpact(selected, adjOut);
    flash(`${impact.size - 1} components depend on ${byId[selected]?.label}`);
  }, [selected, adjOut, byId, flash]);

  const handlePathTrace = useCallback(() => {
    if (!selected) return;
    flash('Path tracing is available in Graph view');
  }, [selected, flash]);

  return (
    <div className="flex-1 flex overflow-hidden relative">
      <div className="flex-1 relative">
        {/* Info bar */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <button
            onClick={onNewAnalysis}
            className="px-3 py-1.5 bg-[#111823] border border-[#232c3c] rounded-md text-[10.5px] text-[#9fb0c6] hover:bg-[#182233] transition-colors"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            ← New scan
          </button>
          <span className="px-3 py-1.5 bg-[#111823] border border-[#232c3c] rounded-md text-[10.5px] text-[#7a869a]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {repoLabel} · {data.nodes.length} nodes · {data.edges.length} edges
          </span>

          {/* Graph / Architecture toggle */}
          <div className="flex rounded-md overflow-hidden border border-[#232c3c]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            <button
              onClick={onSwitchToGraph}
              className="px-3 py-1.5 text-[10px] font-medium transition-colors bg-[#111823] text-[#5b6577] hover:text-[#7a869a]"
            >
              Graph
            </button>
            <button
              className="px-3 py-1.5 text-[10px] font-medium transition-colors bg-[#1e2d42] text-[#60a5fa]"
            >
              Architecture
            </button>
          </div>
        </div>

        {/* Color mode toggle */}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          <div className="flex rounded-md overflow-hidden border border-[#232c3c]">
            <button
              onClick={() => setColorMode('domain')}
              className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                colorMode === 'domain' ? 'bg-[#1e2d42] text-[#60a5fa]' : 'bg-[#111823] text-[#5b6577] hover:text-[#7a869a]'
              }`}
            >
              Domain
            </button>
            <button
              onClick={() => setColorMode('risk')}
              className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                colorMode === 'risk' ? 'bg-[#1e2d42] text-[#60a5fa]' : 'bg-[#111823] text-[#5b6577] hover:text-[#7a869a]'
              }`}
            >
              Risk
            </button>
          </div>
          <button
            onClick={() => { fitView(); renderSVG(); }}
            className="px-3 py-1.5 bg-[#111823] border border-[#232c3c] rounded-md text-[10px] text-[#9fb0c6] hover:bg-[#182233] transition-colors"
          >
            Fit
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-[#182233] border border-[#2a3140] rounded-lg text-[11px] text-[#dbe4f0]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {toast}
          </div>
        )}

        <svg
          ref={svgRef}
          className="w-full h-full bg-[#0a0e14]"
          style={{ cursor: 'grab' }}
        />
      </div>

      {/* Detail Panel */}
      {selected && byId[selected] && (
        <DetailPanel
          node={byId[selected]}
          data={data}
          colorMode={colorMode}
          onClose={() => setSelected(null)}
          onImpact={handleImpact}
          onPathTrace={handlePathTrace}
          onSelectNode={(id) => setSelected(id)}
          onViewSource={sources?.[selected] ? () => onViewSource?.(selected!) : undefined}
        />
      )}
    </div>
  );
}
