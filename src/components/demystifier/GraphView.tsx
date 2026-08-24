'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { DetailPanel } from './DetailPanel';
import { GraphLegend } from './GraphLegend';
import { GraphControls } from './GraphControls';
import { CoveragePanel } from './CoveragePanel';
import {
  EDGE_TYPES, NODE_TYPES,
  type GraphData, type GraphNode, type CoverageData,
} from './types';
import {
  computeImpact, findPath, buildAdjacency,
  project3D, nodeLayer, riskColor, nodeRadius,
} from './graphUtils';

interface GraphViewProps {
  data: GraphData;
  repoLabel: string;
  search: string;
  onNewAnalysis: () => void;
  coverage?: CoverageData | null;
}

type ColorMode = 'domain' | 'risk';
type ViewMode = '2d' | '3d';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function GraphView({ data, repoLabel, search, onNewAnalysis, coverage }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement | null>(null);

  // View state
  const [selected, setSelected] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>('domain');
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [hiddenEdgeTypes, setHiddenEdgeTypes] = useState<Record<string, boolean>>({});
  const [hiddenNodeTypes, setHiddenNodeTypes] = useState<Record<string, boolean>>({});
  const [deadHi, setDeadHi] = useState(false);
  const [cluster, setCluster] = useState(false);
  const [showCoverage, setShowCoverage] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Impact / Path state
  const [impactSet, setImpactSet] = useState<Set<string> | null>(null);
  const [pathResult, setPathResult] = useState<string[] | null>(null);
  const [pathPick, setPathPick] = useState(0);
  const [pathFrom, setPathFrom] = useState<string | null>(null);

  // Transform state (pan/zoom + 3D rotation)
  const viewT = useRef({ x: 0, y: 0, k: 1 });
  const rot = useRef({ yaw: 0.5, pitch: 1.05 });
  const nodePos = useRef<Record<string, { x: number; y: number }>>({});
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; startTx: number; startTy: number; nodeId?: string; mode?: 'pan' | '3d' } | null>(null);

  // Build adjacency once
  const { adjOut, adjIn } = useMemo(() => buildAdjacency(data), [data]);
  const byId = useMemo(() => {
    const map: Record<string, GraphNode> = {};
    data.nodes.forEach(n => { map[n.id] = n; });
    return map;
  }, [data]);

  // Initialize positions
  useEffect(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    data.nodes.forEach(n => { pos[n.id] = { x: n.x ?? 800, y: n.y ?? 550 }; });
    nodePos.current = pos;
    fitView();
    renderSVG();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Re-render on state changes
  useEffect(() => {
    renderSVG();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, colorMode, viewMode, hiddenEdgeTypes, hiddenNodeTypes, deadHi, cluster, impactSet, pathResult, search]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Compute visibility set (impact or path highlighting)
  const getVisSet = useCallback((): Set<string> | null => {
    if (pathResult) return new Set(pathResult);
    if (impactSet) return impactSet;
    return null;
  }, [impactSet, pathResult]);

  const getNodeColor = useCallback((n: GraphNode) => {
    return colorMode === 'risk' ? riskColor(n.risk) : n.color;
  }, [colorMode]);

  const posOf = useCallback((id: string): { x: number; y: number; depth?: number } | null => {
    const p = nodePos.current[id];
    if (!p) return null;
    if (viewMode !== '3d') return p;
    return project3D(p, nodeLayer(byId[id]?.type || 'program'), rot.current);
  }, [viewMode, byId]);

  const applyTransform = useCallback(() => {
    if (gRef.current) {
      const t = viewT.current;
      gRef.current.setAttribute('transform', `translate(${t.x},${t.y}) scale(${t.k})`);
    }
  }, []);

  const fitView = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || data.nodes.length === 0) return;
    const rect = svg.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    data.nodes.forEach(n => {
      const p = posOf(n.id);
      if (!p) return;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
    const pad = 80;
    const dw = maxX - minX + pad * 2;
    const dh = maxY - minY + pad * 2;
    const k = Math.min(rect.width / dw, rect.height / dh, 1.5);
    viewT.current = {
      x: (rect.width - dw * k) / 2 - (minX - pad) * k,
      y: (rect.height - dh * k) / 2 - (minY - pad) * k,
      k,
    };
    applyTransform();
  }, [data, posOf, applyTransform]);

  /** Imperative SVG rendering — performance-critical, avoids React reconciliation */
  const renderSVG = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || !data.nodes.length) return;

    // Clear
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Defs
    const defs = document.createElementNS(SVG_NS, 'defs');
    const marker = document.createElementNS(SVG_NS, 'marker');
    marker.setAttribute('id', 'arw');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M0,0 L10,5 L0,10 z');
    path.setAttribute('fill', '#f97316');
    marker.appendChild(path);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Main group
    const g = document.createElementNS(SVG_NS, 'g');
    svg.appendChild(g);
    gRef.current = g;
    applyTransform();

    const vis = getVisSet();
    const mode3d = viewMode === '3d';
    const searchLower = search.toLowerCase();

    // 3D layer planes
    if (mode3d) {
      const planes = [
        { layer: 0, label: 'INPUTS \u00B7 CICS SCREENS & JCL JOBS' },
        { layer: 1, label: 'PROGRAMS & COPYBOOKS' },
        { layer: 2, label: 'DATA STORES \u00B7 FILES & DB TABLES' },
      ];
      const W = 1600, H = 1100, m = 80;
      planes.forEach(pl => {
        const cs = [
          { x: -m, y: -m }, { x: W + m, y: -m },
          { x: W + m, y: H + m }, { x: -m, y: H + m },
        ].map(c => project3D(c, pl.layer, rot.current));
        const poly = document.createElementNS(SVG_NS, 'polygon');
        poly.setAttribute('points', cs.map(c => `${c.x},${c.y}`).join(' '));
        poly.setAttribute('fill', '#10151f');
        poly.setAttribute('fill-opacity', '0.55');
        poly.setAttribute('stroke', '#232c3c');
        poly.setAttribute('stroke-width', '1');
        g.appendChild(poly);
        const lbl = document.createElementNS(SVG_NS, 'text');
        lbl.setAttribute('x', String(cs[3].x));
        lbl.setAttribute('y', String(cs[3].y + 26));
        lbl.setAttribute('font-size', '15');
        lbl.setAttribute('font-family', 'IBM Plex Mono');
        lbl.setAttribute('letter-spacing', '1');
        lbl.setAttribute('fill', '#5b6577');
        lbl.textContent = pl.label;
        g.appendChild(lbl);
      });
    }

    // Edges
    data.edges.forEach(e => {
      if (hiddenEdgeTypes[e.type]) return;
      if (hiddenNodeTypes[byId[e.source]?.type] || hiddenNodeTypes[byId[e.target]?.type]) return;
      const a = posOf(e.source), b = posOf(e.target);
      if (!a || !b) return;
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(a.x));
      line.setAttribute('y1', String(a.y));
      line.setAttribute('x2', String(b.x));
      line.setAttribute('y2', String(b.y));
      line.setAttribute('stroke', EDGE_TYPES[e.type]?.color || '#666');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-opacity', vis ? (vis.has(e.source) && vis.has(e.target) ? '0.6' : '0.06') : '0.32');
      g.appendChild(line);
    });

    // Nodes (depth-sorted in 3D)
    const drawList = data.nodes
      .filter(n => !hiddenNodeTypes[n.type])
      .map(n => ({ n, p: posOf(n.id) }))
      .filter((o): o is { n: GraphNode; p: { x: number; y: number; depth?: number } } => o.p !== null);

    if (mode3d) drawList.sort((a, b) => ((b.p as { depth?: number }).depth || 0) - ((a.p as { depth?: number }).depth || 0));

    drawList.forEach(({ n, p }) => {
      const r = nodeRadius(n);
      const ng = document.createElementNS(SVG_NS, 'g');
      ng.setAttribute('transform', `translate(${p.x} ${p.y})`);
      ng.style.cursor = 'pointer';

      // Visibility
      let opacity = '1';
      if (vis) opacity = vis.has(n.id) ? '1' : '0.15';
      if (searchLower && !n.label.toLowerCase().includes(searchLower)) {
        opacity = '0.15';
      }
      if (deadHi && n.dead) opacity = '0.3';
      ng.setAttribute('opacity', opacity);

      // Circle
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('r', String(r));
      circle.setAttribute('fill', getNodeColor(n));
      circle.setAttribute('stroke', selected === n.id ? '#fff' : (vis && vis.has(n.id) ? '#f97316' : '#0a0e14'));
      circle.setAttribute('stroke-width', selected === n.id ? '2.2' : '1.4');
      ng.appendChild(circle);

      // Dead code marker
      if (n.dead) {
        const deadMark = document.createElementNS(SVG_NS, 'circle');
        deadMark.setAttribute('r', String(r + 3));
        deadMark.setAttribute('fill', 'none');
        deadMark.setAttribute('stroke', '#ef4444');
        deadMark.setAttribute('stroke-width', '1');
        deadMark.setAttribute('stroke-dasharray', '3,3');
        ng.appendChild(deadMark);
      }

      // Label
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', '0');
      text.setAttribute('y', String(r + 13));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '10.5');
      text.setAttribute('font-family', 'IBM Plex Mono');
      text.setAttribute('fill', selected === n.id ? '#fff' : '#aeb9c9');
      text.textContent = n.label;
      ng.appendChild(text);

      // Click handler
      ng.addEventListener('mousedown', (ev: MouseEvent) => {
        ev.stopPropagation();
        if (pathPick === 2 && pathFrom) {
          // Complete path tracing
          const pathNodes = findPath(pathFrom, n.id, adjOut, adjIn);
          if (pathNodes) {
            setPathResult(pathNodes);
            setPathPick(0);
            flash(`Path: ${pathNodes.length} hops from ${byId[pathFrom]?.label} to ${n.label}`);
          } else {
            flash(`No path found from ${byId[pathFrom]?.label} to ${n.label}`);
            setPathPick(0);
          }
          setPathFrom(null);
          return;
        }
        if (pathPick === 1) {
          setPathFrom(n.id);
          setPathPick(2);
          flash(`From ${n.label} \u2014 click the TARGET node`);
          return;
        }
        if (impactSet) {
          // In impact mode, clicking a node shows its impact
          const impact = computeImpact(n.id, adjOut);
          setImpactSet(impact);
          setSelected(n.id);
          flash(`${impact.size - 1} components depend on ${n.label}`);
          return;
        }
        setSelected(n.id);
        dragState.current = {
          dragging: false,
          startX: ev.clientX,
          startY: ev.clientY,
          startTx: nodePos.current[n.id]?.x || 0,
          startTy: nodePos.current[n.id]?.y || 0,
          nodeId: n.id,
        };
      });

      g.appendChild(ng);
    });

    // Event listeners on SVG
    svg.onmousedown = (ev: MouseEvent) => {
      if (ev.target === svg || (ev.target as Element)?.tagName === 'svg') {
        const isMiddle = ev.button === 1;
        const is3dDrag = mode3d && ev.shiftKey;
        dragState.current = {
          dragging: false,
          startX: ev.clientX,
          startY: ev.clientY,
          startTx: is3dDrag ? rot.current.yaw : viewT.current.x,
          startTy: is3dDrag ? rot.current.pitch : viewT.current.y,
          mode: is3dDrag || isMiddle ? '3d' : 'pan',
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

      if (ds.nodeId && viewMode === '2d') {
        const k = viewT.current.k;
        nodePos.current[ds.nodeId] = {
          x: ds.startTx + dx / k,
          y: ds.startTy + dy / k,
        };
        renderSVG();
        return;
      }

      if (ds.mode === '3d') {
        rot.current = {
          yaw: ds.startTx + dx * 0.005,
          pitch: ds.startTy + dy * 0.005,
        };
        renderSVG();
      } else {
        viewT.current.x = ds.startTx + dx;
        viewT.current.y = ds.startTy + dy;
        applyTransform();
      }
    };

    svg.onmouseup = () => {
      const ds = dragState.current;
      if (ds && !ds.dragging && !ds.nodeId) {
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
  }, [data, selected, colorMode, viewMode, hiddenEdgeTypes, hiddenNodeTypes, deadHi, search,
      impactSet, pathResult, pathPick, pathFrom, byId, adjOut, adjIn, posOf, getVisSet,
      getNodeColor, applyTransform, flash, cluster]);

  // Impact analysis
  const handleImpact = useCallback(() => {
    if (!selected) {
      flash('Select a node first, then run impact analysis');
      return;
    }
    const impact = computeImpact(selected, adjOut);
    setImpactSet(impact);
    flash(`${impact.size - 1} components depend on ${byId[selected]?.label}`);
  }, [selected, adjOut, byId, flash]);

  // Path tracing
  const handlePathTrace = useCallback(() => {
    if (!selected) {
      flash('Select a node first to start path tracing');
      return;
    }
    setPathFrom(selected);
    setPathPick(2);
    setImpactSet(null);
    setPathResult(null);
    setSelected(null);
    flash(`From ${byId[selected]?.label} \u2014 click the TARGET node`);
  }, [selected, byId, flash]);

  // Clear all modes
  const handleClearMode = useCallback(() => {
    setImpactSet(null);
    setPathResult(null);
    setPathPick(0);
    setPathFrom(null);
  }, []);

  // Toggle edge type visibility
  const toggleEdgeType = useCallback((type: string) => {
    setHiddenEdgeTypes(prev => ({ ...prev, [type]: !prev[type] }));
  }, []);

  // Toggle node type visibility
  const toggleNodeType = useCallback((type: string) => {
    setHiddenNodeTypes(prev => ({ ...prev, [type]: !prev[type] }));
  }, []);

  // Banner info
  const bannerInfo = useMemo(() => {
    if (pathResult) {
      return {
        show: true,
        text: `Path: ${pathResult.length} hops \u2014 ${pathResult.map(id => byId[id]?.label).join(' → ')}`,
        bg: '#1c1428',
        border: '#3a2d50',
      };
    }
    if (pathPick) {
      return {
        show: true,
        text: pathPick === 1 ? 'Click the SOURCE node' : `From ${pathFrom ? byId[pathFrom]?.label : '...'} \u2014 click the TARGET node`,
        bg: '#1c1428',
        border: '#3a2d50',
      };
    }
    if (impactSet && selected) {
      return {
        show: true,
        text: `Impact of ${byId[selected]?.label} \u00B7 ${impactSet.size - 1} dependents highlighted`,
        bg: '#131c28',
        border: '#2a3140',
      };
    }
    return { show: false, text: '', bg: '', border: '' };
  }, [pathResult, pathPick, pathFrom, impactSet, selected, byId]);

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* SVG Graph */}
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
            {repoLabel} \u00B7 {data.nodes.length} nodes \u00B7 {data.edges.length} edges
          </span>
          {coverage && (
            <span
              className="px-3 py-1.5 bg-[#111823] border rounded-md flex items-center gap-2"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                borderColor: coverage.coverage_pct >= 90 ? '#22c55e40' :
                             coverage.coverage_pct >= 70 ? '#eab30840' :
                             coverage.coverage_pct >= 50 ? '#f9731640' : '#ef444440',
              }}
            >
              <span
                className="text-[14px] font-bold"
                style={{
                  color: coverage.coverage_pct >= 90 ? '#22c55e' :
                         coverage.coverage_pct >= 70 ? '#eab308' :
                         coverage.coverage_pct >= 50 ? '#f97316' : '#ef4444',
                }}
              >
                {coverage.coverage_pct}%
              </span>
              <span className="text-[9px] text-[#5b6577]">
                {coverage.covered_files}/{coverage.total_files} files
              </span>
            </span>
          )}
        </div>

        {/* Banner */}
        {bannerInfo.show && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-lg text-[11px] flex items-center gap-3"
            style={{
              background: bannerInfo.bg,
              border: `1px solid ${bannerInfo.border}`,
              color: '#dbe4f0',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            <span>{bannerInfo.text}</span>
            <button onClick={handleClearMode} className="text-[#7a869a] hover:text-white">✕</button>
          </div>
        )}

        {/* Controls */}
        <GraphControls
          viewMode={viewMode}
          colorMode={colorMode}
          onViewModeChange={setViewMode}
          onColorModeChange={setColorMode}
          onFitView={fitView}
          onZoomIn={() => {
            viewT.current.k = Math.min(5, viewT.current.k * 1.2);
            applyTransform();
          }}
          onZoomOut={() => {
            viewT.current.k = Math.max(0.1, viewT.current.k / 1.2);
            applyTransform();
          }}
          onImpact={handleImpact}
          onPathTrace={handlePathTrace}
          onClearMode={handleClearMode}
          hasActiveMode={!!impactSet || !!pathResult || pathPick > 0}
          deadHi={deadHi}
          onDeadHiChange={setDeadHi}
          showCoverage={showCoverage}
          onCoverageToggle={() => setShowCoverage(v => !v)}
          hasCoverage={!!coverage}
        />

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
          style={{ cursor: pathPick ? 'crosshair' : 'grab' }}
        />
      </div>

      {/* Legend */}
      <GraphLegend
        colorMode={colorMode}
        hiddenEdgeTypes={hiddenEdgeTypes}
        hiddenNodeTypes={hiddenNodeTypes}
        onToggleEdgeType={toggleEdgeType}
        onToggleNodeType={toggleNodeType}
      />

      {/* Coverage Panel */}
      {showCoverage && coverage && (
        <CoveragePanel data={coverage} onClose={() => setShowCoverage(false)} />
      )}

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
        />
      )}
    </div>
  );
}
