import type { GraphData, CoverageData } from '../types';

export type ProductId = 'demystifier' | 'codeflux' | 'transformer' | 'business-review' | 'rad';

export type TaskType = 'demystifier-scan' | 'codeflux-analysis' | 'transformer-run' | 'business-review-brd';

export type TaskStatus = 'running' | 'completed' | 'failed' | 'superseded';

export interface BackgroundTask<TResult = unknown> {
  id: string;
  type: TaskType;
  product: ProductId;
  label: string;
  status: TaskStatus;
  progress: number;
  progressLabel: string;
  startedAt: number;
  completedAt: number | null;
  error: string | null;
  request: Record<string, unknown>;
  result: TResult | null;
}

export interface DemystifierScanResult {
  graphData: GraphData;
  coverage: CoverageData | null;
  repoLabel: string;
  repoUrl: string;
  branch: string;
  sources: Record<string, string>;
}

export interface TaskExecutorCallbacks {
  setProgress: (pct: number, label?: string) => void;
  checkAborted: () => void;
}
