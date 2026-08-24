import { DOMAINS, type GraphData, type GraphNode, type GraphEdge } from './types';

/** Seeded PRNG matching the prototype */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build deterministic demo data matching the prototype */
export function buildDemoData(seed: number): GraphData {
  const R = rng(seed);
  const pick = <T>(a: T[]): T => a[Math.floor(R() * a.length)];
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const byId: Record<string, GraphNode> = {};

  const add = (n: GraphNode) => { nodes.push(n); byId[n.id] = n; return n; };

  // Programs per domain
  const progCounts: Record<string, number> = { ACT: 9, PAY: 9, CUS: 8, BIL: 7, RPT: 6, BAT: 6 };
  DOMAINS.forEach(d => {
    const n = progCounts[d.id];
    for (let i = 1; i <= n; i++) {
      const id = `${d.prefix}${String(i * 10).padStart(4, '0')}`;
      add({ id, label: id, type: 'program', domain: d.id, color: d.color, loc: 200 + Math.floor(R() * 3800), risk: 0, dead: false, fanIn: 0, fanOut: 0 });
    }
  });

  // Copybooks
  const cbNames = ['CUSTREC', 'ACCTREC', 'PAYFLDS', 'BILLREC', 'TXNREC', 'ERRCODES', 'DATEUTIL', 'WSGLOBAL', 'SQLCA', 'GLREC', 'STMTHDR', 'FEEREC', 'SCRNIO', 'MSGAREA', 'AUDITREC', 'RATEREC', 'LEDGREC', 'JOURNREC'];
  cbNames.forEach((nm, i) => {
    const d = DOMAINS[i % DOMAINS.length];
    add({ id: 'CPY-' + nm, label: nm, type: 'copybook', domain: d.id, color: d.color, loc: 30 + Math.floor(R() * 200), risk: 0, dead: false, fanIn: 0, fanOut: 0 });
  });

  // Tables
  const tbNames = ['ACCTMAST', 'CUSTMAST', 'TXNHIST', 'BILLDTL', 'PAYQUEUE', 'GLLEDGER', 'RATETBL', 'AUDITLOG', 'STMTFILE', 'FEESCHED'];
  tbNames.forEach((nm, i) => {
    const d = DOMAINS[i % DOMAINS.length];
    add({ id: 'TB-' + nm, label: nm, type: 'table', domain: d.id, color: d.color, loc: 0, risk: 0, dead: false, fanIn: 0, fanOut: 0 });
  });

  // Jobs
  const jobNames = ['ACTDLY01', 'PAYRUN02', 'BILLGEN', 'CUSPURGE', 'GLPOST01', 'RPTMTH01', 'STMTPRT', 'RECON01'];
  jobNames.forEach((nm, i) => {
    const d = DOMAINS[i % DOMAINS.length];
    add({ id: 'JCL-' + nm, label: nm, type: 'job', domain: d.id, color: d.color, loc: 20 + Math.floor(R() * 120), risk: 0, dead: false, fanIn: 0, fanOut: 0 });
  });

  // Screens
  const scNames = ['MAINMENU', 'ACCTINQ', 'PAYENTRY', 'CUSTUPD', 'BILLVIEW', 'RPTMENU'];
  scNames.forEach((nm, i) => {
    const d = DOMAINS[i % DOMAINS.length];
    add({ id: 'SCR-' + nm, label: nm, type: 'screen', domain: d.id, color: d.color, loc: 60 + Math.floor(R() * 150), risk: 0, dead: false, fanIn: 0, fanOut: 0 });
  });

  const programs = nodes.filter(n => n.type === 'program');
  const copybooks = nodes.filter(n => n.type === 'copybook');
  const tables = nodes.filter(n => n.type === 'table');
  const seen = new Set<string>();

  const link = (a: string, b: string, type: GraphEdge['type']) => {
    const k = a + '>' + b + type;
    if (a === b || seen.has(k)) return;
    seen.add(k);
    edges.push({ source: a, target: b, type });
  };

  // Program calls (prefer same domain)
  programs.forEach(p => {
    const nCalls = Math.floor(R() * 3.4);
    for (let i = 0; i < nCalls; i++) {
      const sameDom = R() < 0.68;
      const pool = sameDom ? programs.filter(x => x.domain === p.domain) : programs;
      link(p.id, pick(pool).id, 'call');
    }
  });

  // Copies
  programs.forEach(p => {
    const nc = 1 + Math.floor(R() * 3);
    for (let i = 0; i < nc; i++) {
      const sd = copybooks.filter(x => x.domain === p.domain);
      link(p.id, pick(R() < 0.6 && sd.length ? sd : copybooks).id, 'copy');
    }
  });

  // Data access
  programs.forEach(p => {
    const nd = Math.floor(R() * 2.4);
    for (let i = 0; i < nd; i++) {
      const sd = tables.filter(x => x.domain === p.domain);
      link(p.id, pick(R() < 0.6 && sd.length ? sd : tables).id, 'data');
    }
  });

  // Job steps
  nodes.filter(n => n.type === 'job').forEach(j => {
    const sd = programs.filter(x => x.domain === j.domain);
    const ns = 2 + Math.floor(R() * 3);
    for (let i = 0; i < ns; i++) {
      link(j.id, pick(sd.length ? sd : programs).id, 'job');
    }
  });

  // Screen flows
  nodes.filter(n => n.type === 'screen').forEach(s => {
    const sd = programs.filter(x => x.domain === s.domain);
    const ns = 1 + Math.floor(R() * 2);
    for (let i = 0; i < ns; i++) {
      link(s.id, pick(sd.length ? sd : programs).id, 'screen');
    }
  });

  // Fan metrics
  nodes.forEach(n => { n.fanIn = 0; n.fanOut = 0; });
  edges.forEach(e => { byId[e.source].fanOut++; byId[e.target].fanIn++; });

  // Dead code detection
  const callIn: Record<string, number> = {};
  edges.forEach(e => {
    if (e.type === 'call' || e.type === 'job' || e.type === 'screen') {
      callIn[e.target] = (callIn[e.target] || 0) + 1;
    }
  });
  programs.forEach(p => { p.dead = !callIn[p.id]; });

  // Risk scoring
  nodes.forEach(n => {
    const c = n.loc / 4000;
    const f = (n.fanIn + n.fanOut * 1.4) / 14;
    n.risk = Math.max(0.04, Math.min(0.98, 0.35 * c + 0.55 * Math.min(1, f) + (R() * 0.18 - 0.06)));
  });

  return {
    nodes,
    edges,
    domains: DOMAINS,
    metadata: { repo: 'demo', nodeCount: nodes.length, edgeCount: edges.length },
  };
}

/** Force-directed layout algorithm matching the prototype */
export function layoutGraph(data: GraphData): Record<string, { x: number; y: number }> {
  const R = rng(7);
  const { nodes, edges } = data;
  const W = 1600, H = 1100, cx = W / 2, cy = H / 2;

  // Collect all unique domains from the data, merging with known DOMAINS
  const allDomainIds = new Set<string>(DOMAINS.map(d => d.id));
  nodes.forEach(n => { if (n.domain) allDomainIds.add(n.domain); });
  const domainList = Array.from(allDomainIds);

  const domAngle: Record<string, number> = {};
  domainList.forEach((id, i) => { domAngle[id] = (i / domainList.length) * Math.PI * 2; });

  // Initial positioning by domain angle
  nodes.forEach(n => {
    const a = (domAngle[n.domain] ?? R() * Math.PI * 2) + (R() - 0.5) * 1.1;
    const r = 260 + R() * 220;
    n.x = cx + Math.cos(a) * r;
    n.y = cy + Math.sin(a) * r;
  });

  const adj = edges.map(e => [e.source, e.target]);
  const idx: Record<string, number> = {};
  nodes.forEach((n, i) => { idx[n.id] = i; });

  // Force simulation
  for (let it = 0; it < 180; it++) {
    const t = 1 - it / 180;

    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      let fx = 0, fy = 0;
      const a = nodes[i];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const b = nodes[j];
        const dx = a.x! - b.x!, dy = a.y! - b.y!;
        const d2 = dx * dx + dy * dy + 0.01;
        if (d2 > 90000) continue;
        const f = 1600 / d2;
        fx += dx * f;
        fy += dy * f;
      }
      a.x! += fx * t * 0.9;
      a.y! += fy * t * 0.9;
    }

    // Springs
    adj.forEach(([s, tg]) => {
      const a = nodes[idx[s]], b = nodes[idx[tg]];
      if (!a || !b) return;
      const dx = b.x! - a.x!, dy = b.y! - a.y!;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const f = (d - 120) * 0.012 * t;
      const ux = dx / d, uy = dy / d;
      a.x! += ux * f;
      a.y! += uy * f;
      b.x! -= ux * f;
      b.y! -= uy * f;
    });

    // Domain gravity
    const dg = 0.006 * t;
    const centers: Record<string, { x: number; y: number }> = {};
    domainList.forEach(id => {
      const a = domAngle[id];
      centers[id] = { x: cx + Math.cos(a) * 340, y: cy + Math.sin(a) * 340 };
    });
    nodes.forEach(n => {
      const c = centers[n.domain] || { x: cx, y: cy };
      n.x! += (c.x - n.x!) * dg;
      n.y! += (c.y - n.y!) * dg;
      n.x! += (cx - n.x!) * 0.002 * t;
      n.y! += (cy - n.y!) * 0.002 * t;
    });
  }

  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach(n => { positions[n.id] = { x: n.x!, y: n.y! }; });
  return positions;
}

/** Build adjacency maps for impact/path analysis */
export function buildAdjacency(data: GraphData): { adjOut: Record<string, string[]>; adjIn: Record<string, string[]> } {
  const adjOut: Record<string, string[]> = {};
  const adjIn: Record<string, string[]> = {};
  data.edges.forEach(e => {
    (adjOut[e.source] = adjOut[e.source] || []).push(e.target);
    (adjIn[e.target] = adjIn[e.target] || []).push(e.source);
  });
  return { adjOut, adjIn };
}

/** BFS for impact analysis — returns set of all downstream dependents */
export function computeImpact(nodeId: string, adjOut: Record<string, string[]>): Set<string> {
  const visited = new Set<string>([nodeId]);
  const queue = [nodeId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const neighbors = adjOut[curr] || [];
    for (const n of neighbors) {
      if (!visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }
  return visited;
}

/** BFS shortest path between two nodes (bidirectional edges) */
export function findPath(from: string, to: string, adjOut: Record<string, string[]>, adjIn: Record<string, string[]>): string[] | null {
  if (from === to) return [from];
  const prev: Record<string, string | null> = { [from]: null };
  const queue = [from];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const neighbors = [...(adjOut[curr] || []), ...(adjIn[curr] || [])];
    for (const n of neighbors) {
      if (!(n in prev)) {
        prev[n] = curr;
        if (n === to) {
          const path: string[] = [];
          let c: string | null = to;
          while (c !== null) {
            path.unshift(c);
            c = prev[c];
          }
          return path;
        }
        queue.push(n);
      }
    }
  }
  return null;
}

/** 3D projection for the graph */
export function project3D(
  p: { x: number; y: number },
  layer: number,
  rot: { yaw: number; pitch: number }
): { x: number; y: number; depth: number } {
  const px = p.x - 800, pz = p.y - 550, py = (layer - 1) * 460;
  const cy = Math.cos(rot.yaw), sy = Math.sin(rot.yaw);
  const x1 = px * cy + pz * sy, z1 = -px * sy + pz * cy;
  const cp = Math.cos(rot.pitch), sp = Math.sin(rot.pitch);
  const y2 = py * cp - z1 * sp, z2 = py * sp + z1 * cp;
  return { x: x1 + 800, y: y2 + 550, depth: z2 };
}

/** Get node layer for 3D view */
export function nodeLayer(type: string): number {
  if (type === 'job' || type === 'screen') return 0;
  if (type === 'table') return 2;
  return 1;
}

/** Risk to color mapping */
export function riskColor(risk: number): string {
  if (risk > 0.75) return '#ff6b6b';
  if (risk > 0.5) return '#ff9f43';
  if (risk > 0.3) return '#ffd43b';
  return '#51cf66';
}

/** Node radius based on type and connections */
export function nodeRadius(node: GraphNode): number {
  if (node.type === 'program') return 9 + Math.min(6, (node.fanIn + node.fanOut) * 0.4);
  if (node.type === 'job' || node.type === 'screen') return 8;
  if (node.type === 'table') return 7;
  return 6;
}
