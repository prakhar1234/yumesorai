export interface GraphNode {
  id: string;
  label: string;
  type: 'program' | 'copybook' | 'table' | 'job' | 'screen';
  domain: string;
  color: string;
  risk: number;
  dead?: boolean;
  loc: number;
  fanIn: number;
  fanOut: number;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'call' | 'copy' | 'data' | 'job' | 'screen';
}

export interface Domain {
  id: string;
  name: string;
  color: string;
  prefix: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  domains: Domain[];
  metadata: {
    repo: string;
    nodeCount: number;
    edgeCount: number;
  };
}

export interface CoverageData {
  total_files: number;
  covered_files: number;
  coverage_pct: number;
  missing_files: { path: string; name: string; expected_type: string }[];
  extra_nodes: { id: string; type: string }[];
  by_type: Record<string, { total: number; covered: number; pct: number }>;
}

export const DOMAINS: Domain[] = [
  { id: 'ACT', name: 'Accounts', color: '#6ee7a0', prefix: 'ACCT' },
  { id: 'PAY', name: 'Payments', color: '#81b4ff', prefix: 'PAY' },
  { id: 'CUS', name: 'Customer', color: '#ff8ac5', prefix: 'CUST' },
  { id: 'BIL', name: 'Billing', color: '#ffd24d', prefix: 'BILL' },
  { id: 'RPT', name: 'Reporting', color: '#bea4ff', prefix: 'RPT' },
  { id: 'BAT', name: 'Batch/Infra', color: '#45e8f8', prefix: 'BAT' },
];

export const EDGE_TYPES: Record<string, { label: string; color: string }> = {
  call: { label: 'CALL / PERFORM', color: '#f97316' },
  copy: { label: 'COPY (copybook)', color: '#8b93a6' },
  data: { label: 'Data / DB access', color: '#22d3ee' },
  job: { label: 'JCL job step', color: '#a78bfa' },
  screen: { label: 'Screen flow', color: '#f472b6' },
};

export const NODE_TYPES: Record<string, { label: string; glyph: string }> = {
  program: { label: 'Program', glyph: '\u25CF' },
  copybook: { label: 'Copybook', glyph: '\u25C6' },
  table: { label: 'Data file / table', glyph: '\u25AC' },
  job: { label: 'JCL job', glyph: '\u25A0' },
  screen: { label: 'CICS screen', glyph: '\u25AD' },
};
