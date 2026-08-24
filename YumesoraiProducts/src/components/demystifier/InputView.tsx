'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { buildDemoData, layoutGraph, buildAdjacency } from './graphUtils';
import type { GraphData } from './types';

const TABS = [
  { id: 'github', label: 'GitHub', icon: '⬡', placeholder: 'github.com/org/cobol-repo' },
  { id: 'server', label: 'Mainframe', icon: '▣', placeholder: 'sftp://mvs-prod/SYS1.COBOL.SRC' },
] as const;

const SAMPLE_REPOS = [
  { label: 'legacy-bank/core-cobol', url: 'github.com/legacy-bank/core-cobol', desc: '45 programs · 6 domains · CICS + batch' },
  { label: 'insurance-co/claims', url: 'github.com/insurance-co/claims-cobol', desc: '32 programs · 4 domains · DB2 heavy' },
  { label: 'telco/billing-system', url: 'github.com/telco/billing-cobol', desc: '28 programs · 3 domains · batch-only' },
];

const FEATURES = [
  { title: 'Knowledge Graph', desc: 'Interactive SVG graph of all COBOL artifacts and their relationships', icon: '◎' },
  { title: 'Impact Analysis', desc: 'Trace downstream dependencies from any program or copybook', icon: '⚡' },
  { title: 'Path Tracing', desc: 'Find shortest execution path between any two components', icon: '⟿' },
  { title: 'Risk Heatmap', desc: 'Color-code by complexity, fan-out, and change frequency', icon: '🔥' },
];

const STAGE_PERCENTAGES: Record<string, number> = {
  fetch_started: 5,
  fetch_done: 25,
  analysis_started: 30,
  analysis_done: 60,
  validation_started: 65,
  validation_done: 80,
  coverage_started: 85,
  coverage_done: 95,
  complete: 100,
};

interface ProgressState {
  stage: string;
  status: string;
  message: string;
  percentage: number;
  fetchResult: { files_fetched: number; failed: number; error: string | null } | null;
}

interface AnalysisSummary {
  id: string;
  repo_url: string;
  input_type: string;
  created_at: string;
  node_count: number;
  edge_count: number;
}

interface InputViewProps {
  onAnalyzeComplete: (data: GraphData, label: string) => void;
}

function parseSSEEvents(text: string): Array<{ event: string; data: string }> {
  const events: Array<{ event: string; data: string }> = [];
  const blocks = text.split('\n\n');
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.startsWith(':')) continue;
    let event = '';
    let data = '';
    for (const line of trimmed.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice(7);
      else if (line.startsWith('data: ')) data = line.slice(6);
    }
    if (event && data) {
      events.push({ event, data });
    }
  }
  return events;
}

export function InputView({ onAnalyzeComplete }: InputViewProps) {
  const [tab, setTab] = useState<'github' | 'server'>('github');
  const [repoInput, setRepoInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [progressState, setProgressState] = useState<ProgressState>({
    stage: '',
    status: '',
    message: '',
    percentage: 0,
    fetchResult: null,
  });
  const [toast, setToast] = useState<string | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisSummary[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Fetch recent analyses on mount
  useEffect(() => {
    fetch('/api/demystifier/analyses')
      .then(res => res.ok ? res.json() : [])
      .then((data: AnalysisSummary[]) => setRecentAnalyses(data))
      .catch(() => {});
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const defaultRepo = useCallback(() => {
    if (tab === 'github') return 'github.com/legacy-bank/core-cobol';
    return 'sftp://mvs-prod/SYS1.COBOL.SRC';
  }, [tab]);

  const shortLabel = (s: string) =>
    s.replace(/^https?:\/\//, '').replace(/^github\.com\//, '').replace(/\.git$/, '');

  const fallbackToDemoData = useCallback((lbl: string) => {
    const data = buildDemoData(42);
    layoutGraph(data);
    buildAdjacency(data);
    setAnalyzing(false);
    setToast('Backend unavailable — showing demo data');
    onAnalyzeComplete(data, shortLabel(lbl));
  }, [onAnalyzeComplete]);

  const fallbackToBlockingFetch = useCallback((lbl: string, inputType: string) => {
    // Fallback: use the original non-streaming endpoint with a simple timer
    let p = 0;
    const timer = setInterval(() => {
      p = Math.min(90, p + 1.5);
      setProgressState(prev => ({ ...prev, percentage: p, message: 'Analyzing (non-streaming fallback)...' }));
    }, 300);

    fetch('/api/demystifier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: lbl, input_type: inputType }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((data: GraphData) => {
        clearInterval(timer);
        setProgressState(prev => ({ ...prev, percentage: 100, message: 'Complete' }));
        layoutGraph(data);
        buildAdjacency(data);
        setTimeout(() => {
          setAnalyzing(false);
          onAnalyzeComplete(data, shortLabel(lbl));
        }, 350);
      })
      .catch(() => {
        clearInterval(timer);
        setProgressState(prev => ({ ...prev, percentage: 100 }));
        setTimeout(() => fallbackToDemoData(lbl), 300);
      });
  }, [onAnalyzeComplete, fallbackToDemoData]);

  const analyze = useCallback(async (label?: string) => {
    const lbl = label || repoInput || defaultRepo();
    setAnalyzing(true);
    setProgressState({
      stage: '',
      status: '',
      message: 'Connecting...',
      percentage: 0,
      fetchResult: null,
    });

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/demystifier/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: lbl, input_type: tab }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        // SSE endpoint unavailable, fall back to blocking fetch
        fallbackToBlockingFetch(lbl, tab);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (delimited by double newline)
        const events = parseSSEEvents(buffer);
        // Keep only unprocessed trailing content
        const lastDoubleNewline = buffer.lastIndexOf('\n\n');
        if (lastDoubleNewline !== -1) {
          buffer = buffer.slice(lastDoubleNewline + 2);
        }

        for (const evt of events) {
          if (evt.event === 'progress') {
            try {
              const payload = JSON.parse(evt.data);
              const stageKey = `${payload.stage}_${payload.status}`;
              const pct = STAGE_PERCENTAGES[stageKey] ?? 0;

              setProgressState(prev => ({
                stage: payload.stage,
                status: payload.status,
                message: payload.message || prev.message,
                percentage: Math.max(prev.percentage, pct),
                fetchResult: payload.stage === 'fetch' && payload.status === 'done'
                  ? payload.detail
                  : prev.fetchResult,
              }));
            } catch {
              // ignore malformed progress events
            }
          } else if (evt.event === 'result') {
            try {
              const data: GraphData = JSON.parse(evt.data);
              setProgressState(prev => ({ ...prev, percentage: 100, message: 'Complete' }));
              layoutGraph(data);
              buildAdjacency(data);
              setTimeout(() => {
                setAnalyzing(false);
                onAnalyzeComplete(data, shortLabel(lbl));
              }, 350);
              return;
            } catch {
              // Result parse failed, fall back to demo
              setProgressState(prev => ({ ...prev, percentage: 100 }));
              setTimeout(() => fallbackToDemoData(lbl), 300);
              return;
            }
          } else if (evt.event === 'error') {
            try {
              const payload = JSON.parse(evt.data);
              setToast(payload.message || 'Analysis failed');
            } catch {
              setToast('Analysis failed');
            }
            setProgressState(prev => ({ ...prev, percentage: 100 }));
            setTimeout(() => fallbackToDemoData(lbl), 300);
            return;
          }
        }
      }

      // Stream ended without a result event — fall back
      setProgressState(prev => ({ ...prev, percentage: 100 }));
      setTimeout(() => fallbackToDemoData(lbl), 300);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      // SSE connection failed entirely — try blocking fetch, then demo data
      fallbackToBlockingFetch(lbl, tab);
    }
  }, [repoInput, defaultRepo, tab, onAnalyzeComplete, fallbackToDemoData, fallbackToBlockingFetch]);

  const loadSavedAnalysis = useCallback((id: string, repoUrl: string) => {
    setAnalyzing(true);
    setProgressState({ stage: '', status: '', message: 'Loading saved analysis...', percentage: 50, fetchResult: null });

    fetch(`/api/demystifier/analyses/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((record: { result: GraphData; repo_url: string }) => {
        const data = record.result;
        layoutGraph(data);
        buildAdjacency(data);
        setProgressState(prev => ({ ...prev, percentage: 100 }));
        setTimeout(() => {
          setAnalyzing(false);
          onAnalyzeComplete(data, shortLabel(repoUrl));
        }, 200);
      })
      .catch(() => {
        setAnalyzing(false);
        setProgressState({ stage: '', status: '', message: '', percentage: 0, fetchResult: null });
        setToast('Failed to load saved analysis');
      });
  }, [onAnalyzeComplete]);

  const activeTab = TABS.find(t => t.id === tab)!;

  return (
    <div className="flex-1 flex items-center justify-center overflow-auto p-8">
      <div className="w-full max-w-2xl">
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-[#1e2736] border border-[#2a3140] rounded-lg text-xs text-[#f0c050] shadow-lg"
               style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {toast}
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-10">
          <h1
            className="text-3xl font-bold text-[#e6edf7] mb-3"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Demistifier
          </h1>
          <p className="text-sm text-[#7a869a]">
            Connect a COBOL repository to generate an interactive knowledge graph
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-4 bg-[#0c1018] rounded-lg p-1 border border-[#1e2736]">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setRepoInput(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-colors ${
                tab === t.id
                  ? 'bg-[#182233] text-[#e6edf7]'
                  : 'text-[#5b6577] hover:text-[#7a869a]'
              }`}
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={repoInput}
            onChange={e => setRepoInput(e.target.value)}
            placeholder={activeTab.placeholder}
            disabled={analyzing}
            className="flex-1 px-4 py-3 bg-[#111823] border border-[#232c3c] rounded-lg text-sm text-[#dbe4f0] placeholder-[#4a5568] focus:outline-none focus:border-[#3b82f6] disabled:opacity-50"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            onKeyDown={e => e.key === 'Enter' && !analyzing && analyze()}
          />
          <button
            onClick={() => analyze()}
            disabled={analyzing}
            className="px-6 py-3 bg-[#45c4b0] hover:bg-[#3aad9c] text-[#0a0e14] font-semibold text-sm rounded-lg transition-colors disabled:opacity-50"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {analyzing ? 'Scanning...' : 'Scan'}
          </button>
        </div>

        {/* Progress bar */}
        {analyzing && (
          <div className="mb-8">
            <div className="flex justify-between text-[10px] text-[#5b6577] mb-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <span>{progressState.message || 'Connecting...'}</span>
              <span>{Math.round(progressState.percentage)}%</span>
            </div>
            <div className="h-1.5 bg-[#111823] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#45c4b0] to-[#3b82f6] rounded-full transition-all duration-150"
                style={{ width: `${progressState.percentage}%` }}
              />
            </div>
            {/* Fetch result indicator */}
            {progressState.fetchResult && (
              <div className="mt-2 text-[10px] flex items-center gap-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {progressState.fetchResult.error ? (
                  <span className="text-[#f0c050]">
                    Source download failed — analyzing from URL only
                  </span>
                ) : (
                  <span className="text-[#45c4b0]">
                    Downloaded {progressState.fetchResult.files_fetched} source files
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sample repos + Recent analyses + Features */}
        {!analyzing && (
          <>
            <div className="mb-6">
              <p className="text-[10.5px] text-[#5b6577] mb-2 uppercase tracking-wider" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                Sample repositories
              </p>
              <div className="grid gap-2">
                {SAMPLE_REPOS.map(repo => (
                  <button
                    key={repo.url}
                    onClick={() => analyze(repo.url)}
                    className="flex items-center justify-between px-4 py-3 bg-[#0c1018] border border-[#1e2736] rounded-lg hover:bg-[#111823] hover:border-[#2a3140] transition-colors text-left"
                  >
                    <span>
                      <span className="block text-[12px] font-medium text-[#e6edf7]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {repo.label}
                      </span>
                      <span className="block text-[10.5px] text-[#5b6577]">
                        {repo.desc}
                      </span>
                    </span>
                    <span className="text-[#45c4b0] text-sm">→</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent analyses */}
            {recentAnalyses.length > 0 && (
              <div className="mb-6">
                <p className="text-[10.5px] text-[#5b6577] mb-2 uppercase tracking-wider" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  Recent analyses
                </p>
                <div className="grid gap-2">
                  {recentAnalyses.slice(0, 5).map(a => (
                    <button
                      key={a.id}
                      onClick={() => loadSavedAnalysis(a.id, a.repo_url)}
                      className="flex items-center justify-between px-4 py-3 bg-[#0c1018] border border-[#1e2736] rounded-lg hover:bg-[#111823] hover:border-[#2a3140] transition-colors text-left"
                    >
                      <span>
                        <span className="block text-[12px] font-medium text-[#e6edf7]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                          {shortLabel(a.repo_url)}
                        </span>
                        <span className="block text-[10.5px] text-[#5b6577]">
                          {a.node_count} nodes · {a.edge_count} edges · {new Date(a.created_at).toLocaleDateString()}
                        </span>
                      </span>
                      <span className="text-[#3b82f6] text-sm">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map(f => (
                <div key={f.title} className="px-4 py-3 bg-[#0c1018] border border-[#1e2736] rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{f.icon}</span>
                    <span className="text-[11px] font-semibold text-[#e6edf7]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {f.title}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[#5b6577] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
