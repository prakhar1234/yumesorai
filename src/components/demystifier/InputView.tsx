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

export function InputView({ onAnalyzeComplete }: InputViewProps) {
  const [tab, setTab] = useState<'github' | 'server'>('github');
  const [repoInput, setRepoInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisSummary[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
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

  const analyze = useCallback((label?: string) => {
    const lbl = label || repoInput || defaultRepo();
    setAnalyzing(true);
    setProgress(0);

    // Start progress animation
    let p = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      p += 1;
      // Cap at 90% while waiting for the API (slower pace for source download + LLM)
      setProgress(prev => Math.min(90, prev + 1.5));
    }, 300);

    // Call the backend API
    fetch('/api/demystifier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: lbl, input_type: tab }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((data: GraphData & { fetch_status?: { source: string; files_fetched: number; error: string | null } }) => {
        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(100);
        layoutGraph(data);
        buildAdjacency(data);

        // Show fetch status to user
        const fs = data.fetch_status;
        if (fs) {
          if (fs.error) {
            setToast(`Source download failed — analyzed from URL only. Error: ${fs.error}`);
          } else if (fs.files_fetched > 0) {
            setToast(`Downloaded ${fs.files_fetched} source files from GitHub for analysis`);
          }
        }

        setTimeout(() => {
          setAnalyzing(false);
          onAnalyzeComplete(data, shortLabel(lbl));
        }, 350);
      })
      .catch(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(100);
        setTimeout(() => fallbackToDemoData(lbl), 300);
      });
  }, [repoInput, defaultRepo, tab, onAnalyzeComplete, fallbackToDemoData]);

  const loadSavedAnalysis = useCallback((id: string, repoUrl: string) => {
    setAnalyzing(true);
    setProgress(50);

    fetch(`/api/demystifier/analyses/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((record: { result: GraphData; repo_url: string }) => {
        const data = record.result;
        layoutGraph(data);
        buildAdjacency(data);
        setProgress(100);
        setTimeout(() => {
          setAnalyzing(false);
          onAnalyzeComplete(data, shortLabel(repoUrl));
        }, 200);
      })
      .catch(() => {
        setAnalyzing(false);
        setProgress(0);
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
              <span>
                {progress < 15 ? 'Connecting to GitHub...' :
                 progress < 35 ? 'Downloading COBOL sources...' :
                 progress < 55 ? 'Analyzing source code...' :
                 progress < 75 ? 'Building dependency graph...' :
                 progress < 88 ? 'Computing domains & risk...' :
                 'Laying out knowledge graph...'}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-[#111823] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#45c4b0] to-[#3b82f6] rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
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
