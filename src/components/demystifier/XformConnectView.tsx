'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

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

const LANGUAGES = [
  { id: 'java', label: 'Java / Spring Boot' },
  { id: 'csharp', label: 'C# / .NET 8' },
  { id: 'python', label: 'Python / FastAPI' },
  { id: 'microservices', label: 'Cloud microservices' },
];

const DATABASES = [
  { id: 'postgresql', label: 'PostgreSQL' },
  { id: 'oracle', label: 'Oracle' },
  { id: 'mssql', label: 'MS SQL' },
  { id: 'dynamodb', label: 'DynamoDB' },
];

interface XformConnectViewProps {
  onConnect: (url: string, branch: string, result: SourcesResult, lang: string, db: string) => void;
}

export function XformConnectView({ onConnect }: XformConnectViewProps) {
  const [repoInput, setRepoInput] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [lang, setLang] = useState('java');
  const [db, setDb] = useState('postgresql');
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
    const url = repoInput.trim();
    if (!url) return;
    const branch = selectedBranch || 'main';

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setConnecting(true);
    setConnectError(null);
    setConnectStage('Checking for cached data...');
    setConnectDetail('');

    try {
      // Step 1: Quick pre-check
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
        // Pre-check failure is non-fatal
      }

      // Step 2: Show status
      if (hasCache) {
        const fileCount = cacheInfo.file_count ?? 0;
        const fetchedAt = cacheInfo.fetched_at
          ? new Date(cacheInfo.fetched_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            + ', ' + new Date(cacheInfo.fetched_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
          : '';
        setConnectStage('Cache found -- verifying freshness with GitHub...');
        setConnectDetail(
          `${fileCount} files cached` + (fetchedAt ? ` · last fetched ${fetchedAt}` : '')
        );
      } else {
        setConnectStage('No cache -- fetching source files from GitHub...');
        setConnectDetail('First fetch downloads all COBOL files');
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

      if (result.cached) {
        setConnectStage('Loaded from cache -- no changes on GitHub');
        setConnectDetail(`${result.sources.length} files · code unchanged since last fetch`);
      } else {
        setConnectStage('Fetched fresh from GitHub');
        setConnectDetail(`${result.sources.length} files downloaded`);
      }
      await new Promise(r => setTimeout(r, 600));

      onConnect(url, branch, result, lang, db);
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setConnectError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      if (!controller.signal.aborted) {
        setConnecting(false);
      }
    }
  }, [repoInput, selectedBranch, lang, db, onConnect]);

  return (
    <div className="flex-1 flex items-center justify-center overflow-auto p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#112030] border border-[#1e2736] mb-4">
            <span className="text-2xl text-[#45c4b0]">{'\u27BF'}</span>
          </div>
          <h1
            className="text-xl font-semibold text-[#e6edf7] mb-2"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Transformer
          </h1>
          <p className="text-[12px] text-[#7a869a] leading-relaxed max-w-md mx-auto" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Connect a COBOL repository and configure your target stack to begin automated code transformation
          </p>
        </div>

        {/* Repo input + Branch dropdown row */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={repoInput}
            onChange={e => setRepoInput(e.target.value)}
            placeholder="github.com/org/cobol-repo"
            disabled={connecting}
            className="flex-1 px-4 py-3 bg-[#111823] border border-[#232c3c] rounded-lg text-sm text-[#dbe4f0] placeholder-[#4a5568] focus:outline-none focus:border-[#45c4b0] disabled:opacity-50"
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
                dropdownOpen ? 'border-[#45c4b0]' : 'border-[#232c3c]'
              } ${branches.length > 0 ? 'hover:border-[#45c4b0]' : ''}`}
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
        </div>

        {/* Branch fetch error hint */}
        {branchError && !connecting && (
          <p
            className="text-[10px] text-[#7a869a] mb-4 -mt-2"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Could not load branches -- will default to <span className="text-[#9fb0c6]">main</span>
          </p>
        )}

        {/* Target configuration */}
        {!connecting && (
          <div className="bg-[#0c1018] border border-[#1e2736] rounded-xl p-5 mb-4 space-y-4">
            {/* Target language */}
            <div>
              <label
                className="block text-[11px] font-medium text-[#7a869a] mb-1.5 uppercase tracking-wider"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                Target language
              </label>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLang(l.id)}
                    className={`px-3 py-2 text-[12px] rounded-lg border transition-colors text-left ${
                      lang === l.id
                        ? 'bg-[#112030] border-[#45c4b0] text-[#45c4b0]'
                        : 'bg-[#111823] border-[#232c3c] text-[#9fb0c6] hover:border-[#3a4a5c]'
                    }`}
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target database */}
            <div>
              <label
                className="block text-[11px] font-medium text-[#7a869a] mb-1.5 uppercase tracking-wider"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                Target database
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DATABASES.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDb(d.id)}
                    className={`px-3 py-2 text-[12px] rounded-lg border transition-colors text-left ${
                      db === d.id
                        ? 'bg-[#112030] border-[#45c4b0] text-[#45c4b0]'
                        : 'bg-[#111823] border-[#232c3c] text-[#9fb0c6] hover:border-[#3a4a5c]'
                    }`}
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Connection error */}
        {connectError && !connecting && (
          <div className="mb-4 px-4 py-3 bg-[#ef444410] border border-[#ef444440] rounded-lg">
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
          <div className="mb-6">
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

        {/* Connect button */}
        <button
          onClick={connect}
          disabled={connecting || !repoInput.trim()}
          className="w-full py-2.5 text-[13px] font-semibold rounded-lg bg-[#45c4b0] text-[#0a0e14] hover:bg-[#3db3a0] transition-colors disabled:opacity-50"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {connecting ? 'Connecting...' : 'Connect & Scan Repository'}
        </button>
      </div>
    </div>
  );
}
