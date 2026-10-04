'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

const FEATURES = [
  { title: 'Impact Preview', desc: 'Edit COBOL code with real-time impact preview across programs and copybooks', icon: '⚡' },
  { title: 'AI Analysis', desc: 'AI-powered change analysis identifies affected components and potential risks', icon: '◎' },
  { title: 'Approval Workflow', desc: 'Built-in Draft, Review, and Approval flow for governed change management', icon: '⇌' },
];

interface BranchInfo {
  name: string;
  default: boolean;
}

interface SourceFile {
  path: string;
  name: string;
  ext: string;
  type: string;
  content: string;
}

interface SourcesResult {
  sources: SourceFile[];
  cached: boolean;
  commit_sha: string;
  commit_date: string;
}

interface FluxConnectViewProps {
  onConnect: (url: string, branch: string, result: SourcesResult) => void;
}

export function FluxConnectView({ onConnect }: FluxConnectViewProps) {
  const [repoInput, setRepoInput] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectStage, setConnectStage] = useState('');
  const [connectDetail, setConnectDetail] = useState('');
  const fetchRef = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch branches when repo URL looks valid (debounced)
  useEffect(() => {
    const url = repoInput.trim();
    // Basic check: needs at least "something/something"
    const stripped = url.replace(/^https?:\/\//, '').replace(/^github\.com\//, '');
    const parts = stripped.split('/').filter(Boolean);
    if (parts.length < 2) {
      setBranches([]);
      setSelectedBranch('');
      setBranchError(null);
      return;
    }

    const id = ++fetchRef.current;
    const timer = setTimeout(async () => {
      setLoadingBranches(true);
      setBranchError(null);

      try {
        const resp = await fetch('/api/demystifier/branches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_url: url }),
        });

        if (id !== fetchRef.current) return;

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: 'Failed to fetch branches' }));
          throw new Error(err.error || `HTTP ${resp.status}`);
        }

        const data = await resp.json();
        if (id !== fetchRef.current) return;

        const fetched: BranchInfo[] = data.branches || [];
        setBranches(fetched);

        // Auto-select default branch
        const defaultBranch = fetched.find(b => b.default);
        setSelectedBranch(defaultBranch ? defaultBranch.name : fetched[0]?.name || '');
        setBranchError(null);
      } catch (e) {
        if (id !== fetchRef.current) return;
        setBranches([]);
        setSelectedBranch('');
        setBranchError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (id === fetchRef.current) {
          setLoadingBranches(false);
        }
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [repoInput]);

  const connect = useCallback(async () => {
    const url = repoInput || 'github.com/legacy-bank/core-cobol';
    const branch = selectedBranch || 'main';

    // Abort any previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setConnecting(true);
    setConnectError(null);
    setConnectStage('Checking for cached data...');
    setConnectDetail('');

    try {
      // Step 1: Quick pre-check — does a local cache exist? (fast, disk-only)
      let hasCache = false;
      let cacheInfo: { file_count?: number; commit_date?: string; fetched_at?: string } = {};
      try {
        const checkResp = await fetch('/api/demystifier/sources/check-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_url: url, branch }),
          signal: controller.signal,
        });
        if (checkResp.ok) {
          const checkData = await checkResp.json();
          hasCache = checkData.has_cache === true;
          cacheInfo = checkData;
        }
      } catch {
        // Pre-check failure is non-fatal — proceed with the main fetch
      }

      // Step 2: Show the right message based on cache status
      if (hasCache) {
        const fileCount = cacheInfo.file_count ?? 0;
        const fetchedAt = cacheInfo.fetched_at
          ? new Date(cacheInfo.fetched_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            + ', ' + new Date(cacheInfo.fetched_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
          : '';
        setConnectStage('Cache found — verifying freshness with GitHub...');
        setConnectDetail(
          `${fileCount} files cached` + (fetchedAt ? ` · last fetched ${fetchedAt}` : '') + ' · ~2-5s'
        );
      } else {
        setConnectStage('No cache — fetching source files from GitHub...');
        setConnectDetail('First fetch downloads all COBOL files · ~15-45s');
      }

      // Step 3: Actual sources fetch
      const resp = await fetch('/api/demystifier/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: url, branch }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Failed to fetch sources' }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      setConnectStage('Building file tree...');
      setConnectDetail('');
      const data = await resp.json();

      const result: SourcesResult = {
        sources: data.sources || [],
        cached: data.cached ?? false,
        commit_sha: data.commit_sha || 'unknown',
        commit_date: data.commit_date || '',
      };

      if (result.sources.length === 0) {
        throw new Error('No COBOL source files found in this repository');
      }

      // Show result briefly before transitioning
      if (result.cached) {
        setConnectStage('Loaded from cache — no changes on GitHub');
        setConnectDetail(`${result.sources.length} files · code unchanged since last fetch`);
      } else {
        setConnectStage('Fetched fresh from GitHub');
        setConnectDetail(`${result.sources.length} files downloaded`);
      }
      await new Promise(r => setTimeout(r, 600));

      onConnect(url, branch, result);
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setConnectError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      if (!controller.signal.aborted) {
        setConnecting(false);
      }
    }
  }, [repoInput, selectedBranch, onConnect]);

  return (
    <div className="flex-1 flex items-center justify-center overflow-auto p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1
            className="text-3xl font-bold text-[#e6edf7] mb-3"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Code Flux
          </h1>
          <p className="text-sm text-[#7a869a]">
            Connect a COBOL repository to start making governed changes with impact preview
          </p>
        </div>

        {/* Repo input + Branch dropdown row */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={repoInput}
            onChange={e => setRepoInput(e.target.value)}
            placeholder="github.com/org/cobol-repo"
            disabled={connecting}
            className="flex-1 px-4 py-3 bg-[#111823] border border-[#232c3c] rounded-lg text-sm text-[#dbe4f0] placeholder-[#4a5568] focus:outline-none focus:border-[#3b82f6] disabled:opacity-50"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            onKeyDown={e => e.key === 'Enter' && !connecting && connect()}
          />

          {/* Branch dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                if (!connecting && branches.length > 0) setDropdownOpen(prev => !prev);
              }}
              disabled={connecting || branches.length === 0}
              className={`flex items-center gap-2 h-full px-3 py-3 bg-[#111823] border rounded-lg text-[12px] transition-colors disabled:opacity-40 ${
                dropdownOpen ? 'border-[#3b82f6]' : 'border-[#232c3c]'
              } ${branches.length > 0 ? 'hover:border-[#3b82f6]' : ''}`}
              style={{ fontFamily: "'IBM Plex Mono', monospace", minWidth: '160px' }}
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
                className={`w-3 h-3 shrink-0 text-[#5b6577] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && branches.length > 0 && (
              <div
                className="absolute right-0 top-full mt-1 w-56 max-h-60 overflow-y-auto bg-[#111823] border border-[#232c3c] rounded-lg shadow-xl z-50"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {branches.map(b => (
                  <button
                    key={b.name}
                    onClick={() => {
                      setSelectedBranch(b.name);
                      setDropdownOpen(false);
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

          <button
            onClick={connect}
            disabled={connecting}
            className="px-6 py-3 bg-[#45c4b0] hover:bg-[#3aad9c] text-[#0a0e14] font-semibold text-sm rounded-lg transition-colors disabled:opacity-50"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {connecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>

        {/* Branch fetch error hint */}
        {branchError && !connecting && (
          <p
            className="text-[10px] text-[#7a869a] mb-4 -mt-4"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Could not load branches — will default to <span className="text-[#9fb0c6]">main</span>
          </p>
        )}

        {/* Connection error */}
        {connectError && !connecting && (
          <div className="mb-6 px-4 py-3 bg-[#ef444410] border border-[#ef444440] rounded-lg">
            <p
              className="text-[11px] text-[#ef4444]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {connectError}
            </p>
          </div>
        )}

        {/* Loading indicator */}
        {connecting && (
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-[#45c4b0] border-t-transparent rounded-full animate-spin shrink-0" />
              <span
                className="text-[11px] text-[#9fb0c6]"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {connectStage}
              </span>
            </div>
            {connectDetail && (
              <p
                className="text-[10px] text-[#5b6577] mt-1.5 ml-7"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {connectDetail}
              </p>
            )}
          </div>
        )}

        {/* Features */}
        {!connecting && (
          <div className="grid gap-3">
            {FEATURES.map(f => (
              <div key={f.title} className="flex items-start gap-4 px-5 py-4 bg-[#0c1018] border border-[#1e2736] rounded-lg">
                <span className="text-lg mt-0.5">{f.icon}</span>
                <div>
                  <span
                    className="block text-[12px] font-semibold text-[#e6edf7] mb-1"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {f.title}
                  </span>
                  <p className="text-[11px] text-[#7a869a] leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
