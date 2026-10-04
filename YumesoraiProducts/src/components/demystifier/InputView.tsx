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

interface BranchInfo {
  name: string;
  default: boolean;
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

export function InputView({ onAnalyzeComplete }: InputViewProps) {
  const [tab, setTab] = useState<'github' | 'server'>('github');
  const [repoInput, setRepoInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanSourceCached, setScanSourceCached] = useState<boolean | null>(null);
  const [scanDetail, setScanDetail] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisSummary[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Branch selection (GitHub tab only)
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const branchFetchRef = useRef(0);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

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

  // Close branch dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setBranchDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch branches when GitHub repo URL looks valid (debounced)
  useEffect(() => {
    if (tab !== 'github') {
      setBranches([]);
      setSelectedBranch('');
      setBranchError(null);
      return;
    }

    const url = repoInput.trim();
    const cleaned = url.replace(/^https?:\/\//, '').replace(/\.git$/, '');
    if (!/^github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/.test(cleaned)) {
      setBranches([]);
      setSelectedBranch('');
      setBranchError(null);
      return;
    }

    const id = ++branchFetchRef.current;
    const timer = setTimeout(async () => {
      setLoadingBranches(true);
      setBranchError(null);

      try {
        const resp = await fetch('/api/demystifier/branches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_url: url }),
        });

        if (id !== branchFetchRef.current) return;

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: 'Failed to fetch branches' }));
          throw new Error(err.error || `HTTP ${resp.status}`);
        }

        const data = await resp.json();
        if (id !== branchFetchRef.current) return;

        const fetched: BranchInfo[] = data.branches || [];
        setBranches(fetched);

        const defaultBranch = fetched.find(b => b.default);
        setSelectedBranch(defaultBranch ? defaultBranch.name : fetched[0]?.name || '');
        setBranchError(null);
      } catch (e) {
        if (id !== branchFetchRef.current) return;
        setBranches([]);
        setSelectedBranch('');
        setBranchError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (id === branchFetchRef.current) {
          setLoadingBranches(false);
        }
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [repoInput, tab]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const shortLabel = (s: string) =>
    s.replace(/^https?:\/\//, '').replace(/^github\.com\//, '').replace(/\.git$/, '');

  const isValidGithubRepo = (input: string): boolean => {
    const cleaned = input.replace(/^https?:\/\//, '').replace(/\.git$/, '');
    return /^github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/.test(cleaned);
  };

  const isValidServerPath = (input: string): boolean => {
    return input.trim().length > 0 && /^[a-zA-Z]+:\/\//.test(input.trim());
  };

  const fallbackToDemoData = useCallback((lbl: string) => {
    const data = buildDemoData(42);
    layoutGraph(data);
    buildAdjacency(data);
    setAnalyzing(false);
    setToast('Backend unavailable — showing demo data');
    onAnalyzeComplete(data, shortLabel(lbl));
  }, [onAnalyzeComplete]);

  const analyze = useCallback(async (label?: string) => {
    const lbl = label || repoInput.trim();

    // Validate input — sample repos pass a label directly and skip validation
    if (!label) {
      if (!lbl) {
        setToast('Please enter a repository URL');
        return;
      }
      if (tab === 'github' && !isValidGithubRepo(lbl)) {
        setToast('Enter a valid GitHub repo — e.g. github.com/org/repo');
        return;
      }
      if (tab === 'server' && !isValidServerPath(lbl)) {
        setToast('Enter a valid server path — e.g. sftp://host/path');
        return;
      }
    }

    setAnalyzing(true);
    setProgress(0);
    setScanSourceCached(null);
    setScanDetail('');

    // Start progress animation
    let p = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      p += 1;
      // Cap at 90% while waiting for the API (slower pace for source download + LLM)
      setProgress(prev => Math.min(90, prev + 1.5));
    }, 300);

    const branch = tab === 'github' && selectedBranch ? selectedBranch : undefined;

    // Pre-check: are sources cached locally? (fast, disk-only)
    if (tab === 'github') {
      try {
        const checkResp = await fetch('/api/demystifier/sources/check-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_url: lbl, branch: branch || 'main' }),
        });
        if (checkResp.ok) {
          const checkData = await checkResp.json();
          const hasSrcCache = checkData.has_cache === true;
          setScanSourceCached(hasSrcCache);
          if (hasSrcCache) {
            const fileCount = checkData.file_count ?? 0;
            const fetchedAt = checkData.fetched_at
              ? new Date(checkData.fetched_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                + ', ' + new Date(checkData.fetched_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
              : '';
            setScanDetail(
              `${fileCount} source files cached` + (fetchedAt ? ` · fetched ${fetchedAt}` : '') + ' · ~5-15s'
            );
          } else {
            setScanDetail('First scan — downloading sources + AI analysis · ~30-90s');
          }
        }
      } catch {
        // Pre-check failure is non-fatal
      }
    }

    // Call the backend API
    fetch('/api/demystifier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: lbl, input_type: tab, ...(branch && { branch }) }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((data: GraphData & { fetch_status?: { source: string; files_fetched: number; error: string | null }; cached?: boolean }) => {
        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(100);
        layoutGraph(data);
        buildAdjacency(data);

        // Show fetch status to user
        if (data.cached) {
          setToast('Using cached analysis — repo unchanged since last scan');
        } else {
          const fs = data.fetch_status;
          if (fs) {
            if (fs.error) {
              setToast(`Source download failed — analyzed from URL only. Error: ${fs.error}`);
            } else if (fs.files_fetched > 0) {
              setToast(`Downloaded ${fs.files_fetched} source files from GitHub for analysis`);
            }
          }
        }

        setTimeout(() => {
          setAnalyzing(false);
          onAnalyzeComplete(data, shortLabel(lbl));
        }, 350);
      })
      .catch(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(0);
        setAnalyzing(false);
        setToast('Backend unavailable — analysis requires the API server to be running');
      });
  }, [repoInput, tab, selectedBranch, onAnalyzeComplete, fallbackToDemoData]);

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
              onClick={() => { setTab(t.id); setRepoInput(''); setBranches([]); setSelectedBranch(''); setBranchError(null); }}
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
        <div className="flex gap-2 mb-2">
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

          {/* Branch dropdown (GitHub tab only) */}
          {tab === 'github' && (
            <div className="relative" ref={branchDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  if (!analyzing && branches.length > 0) setBranchDropdownOpen(prev => !prev);
                }}
                disabled={analyzing || branches.length === 0}
                className={`flex items-center gap-2 h-full px-3 py-3 bg-[#111823] border rounded-lg text-[12px] transition-colors disabled:opacity-40 ${
                  branchDropdownOpen ? 'border-[#3b82f6]' : 'border-[#232c3c]'
                } ${branches.length > 0 ? 'hover:border-[#3b82f6]' : ''}`}
                style={{ fontFamily: "'IBM Plex Mono', monospace", minWidth: '150px' }}
              >
                {loadingBranches ? (
                  <span className="flex items-center gap-2 text-[#5b6577]">
                    <span className="inline-block w-3 h-3 border border-[#5b6577] border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </span>
                ) : branchError ? (
                  <span className="text-[#ef4444] truncate">No branches</span>
                ) : selectedBranch ? (
                  <span className="text-[#dbe4f0] truncate">{selectedBranch}</span>
                ) : (
                  <span className="text-[#4a5568]">Branch</span>
                )}
                <svg
                  className={`w-3 h-3 shrink-0 text-[#5b6577] transition-transform ${branchDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {branchDropdownOpen && branches.length > 0 && (
                <div
                  className="absolute right-0 top-full mt-1 w-56 max-h-60 overflow-y-auto bg-[#111823] border border-[#232c3c] rounded-lg shadow-xl z-50"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {branches.map(b => (
                    <button
                      key={b.name}
                      onClick={() => {
                        setSelectedBranch(b.name);
                        setBranchDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-2 text-left text-[12px] transition-colors ${
                        selectedBranch === b.name
                          ? 'bg-[#182233] text-[#e6edf7]'
                          : 'text-[#9fb0c6] hover:bg-[#182233]'
                      }`}
                    >
                      <span className="truncate">{b.name}</span>
                      {b.default && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#45c4b020] text-[#45c4b0] ml-2 shrink-0">
                          default
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => analyze()}
            disabled={analyzing}
            className="px-6 py-3 bg-[#45c4b0] hover:bg-[#3aad9c] text-[#0a0e14] font-semibold text-sm rounded-lg transition-colors disabled:opacity-50"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {analyzing ? 'Scanning...' : 'Scan'}
          </button>
        </div>

        {/* Branch fetch hint */}
        {tab === 'github' && branchError && !analyzing && (
          <p
            className="text-[10px] text-[#7a869a] mb-4"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Could not load branches — will default to <span className="text-[#9fb0c6]">main</span>
          </p>
        )}
        {tab === 'github' && !branchError && !loadingBranches && selectedBranch && !analyzing && (
          <div className="mb-4" />
        )}
        {tab !== 'github' && <div className="mb-4" />}

        {/* Progress bar */}
        {analyzing && (
          <div className="mb-8">
            <div className="flex justify-between text-[11px] text-[#7a869a] mb-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#45c4b0] animate-pulse" />
                {scanSourceCached === true
                  ? (progress < 15 ? 'Loading cached sources...' :
                     progress < 40 ? 'Checking analysis cache...' :
                     progress < 60 ? 'Analyzing source code...' :
                     progress < 80 ? 'Building dependency graph...' :
                     progress < 90 ? 'Computing domains & risk...' :
                     'Laying out knowledge graph...')
                  : (progress < 15 ? 'Connecting to GitHub...' :
                     progress < 35 ? 'Downloading COBOL sources...' :
                     progress < 55 ? 'Analyzing source code...' :
                     progress < 75 ? 'Building dependency graph...' :
                     progress < 88 ? 'Computing domains & risk...' :
                     'Laying out knowledge graph...')}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-[#111823] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#45c4b0] to-[#3b82f6] rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            {scanDetail && (
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded ${
                    scanSourceCached
                      ? 'text-[#45c4b0] bg-[#45c4b018]'
                      : 'text-[#58b0ff] bg-[#58b0ff18]'
                  }`}
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {scanSourceCached ? 'Cached' : 'Fresh'}
                </span>
                <span
                  className="text-[10px] text-[#5b6577]"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {scanDetail}
                </span>
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
