'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface SourceFile {
  path: string;
  name: string;
  ext: string;
  type: string;
  content: string;
}

interface XformWorkspaceProps {
  repoUrl: string;
  branch: string;
  sources: SourceFile[];
  commitSha: string;
  targetLang: string;
  targetDb: string;
  onBack: () => void;
}

type Stage = 'plan' | 'transform' | 'parity' | 'performance';

interface ProgramEntry {
  name: string;
  path: string;
  loc: number;
  calls: number;
  sql: number;
  complexity: 'LOW' | 'MED' | 'HIGH';
  content: string;
}

/* ---------- Parity Types ---------- */

interface ParityDiffLine {
  lineNum: number;
  expected: string;
  actual: string;
  status: 'match' | 'mismatch' | 'missing_expected' | 'missing_actual';
}

interface ParityComparisonResult {
  totalLines: number;
  matchCount: number;
  mismatchCount: number;
  diffs: ParityDiffLine[];
}

function runParityComparison(expected: string, actual: string): ParityComparisonResult {
  const expLines = expected.split('\n');
  const actLines = actual.split('\n');
  const maxLen = Math.max(expLines.length, actLines.length);
  const diffs: ParityDiffLine[] = [];
  let matchCount = 0;
  let mismatchCount = 0;

  for (let i = 0; i < maxLen; i++) {
    const exp = i < expLines.length ? expLines[i] : undefined;
    const act = i < actLines.length ? actLines[i] : undefined;

    if (exp === undefined) {
      diffs.push({ lineNum: i + 1, expected: '', actual: act!, status: 'missing_expected' });
      mismatchCount++;
    } else if (act === undefined) {
      diffs.push({ lineNum: i + 1, expected: exp, actual: '', status: 'missing_actual' });
      mismatchCount++;
    } else if (exp === act) {
      diffs.push({ lineNum: i + 1, expected: exp, actual: act, status: 'match' });
      matchCount++;
    } else {
      diffs.push({ lineNum: i + 1, expected: exp, actual: act, status: 'mismatch' });
      mismatchCount++;
    }
  }

  return { totalLines: maxLen, matchCount, mismatchCount, diffs };
}

const COMPLEXITY_COLORS: Record<string, string> = {
  LOW: '#4ade80',
  MED: '#fbbf24',
  HIGH: '#f97316',
};

/* ---------- Agent Loop Types ---------- */

interface LoopEvent {
  type: 'iteration_start' | 'status' | 'error' | 'result';
  iteration?: number;
  max_iterations?: number;
  step?: string;
  message?: string;
  errors?: string;
  diff?: string;
  notes?: string;
  actual_output?: string;
  success?: boolean;
  iterations?: number;
  reason?: string;
  modern_source?: string;
}

/* ---------- Performance Types ---------- */

interface PerfCategory {
  name: string;
  cobol_score: number;
  modern_score: number;
  cobol_notes: string;
  modern_notes: string;
  recommendation: string;
}

interface PerfData {
  summary: string;
  verdict: 'faster' | 'comparable' | 'slower';
  categories: PerfCategory[];
  overall_cobol_score: number;
  overall_modern_score: number;
}

/* ---------- Execution Benchmark Types ---------- */

interface BenchmarkTimingStats {
  mean_ms: number;
  min_ms: number;
  max_ms: number;
  runs: number[];
}

interface BenchmarkResult {
  cobol: BenchmarkTimingStats;
  modern: BenchmarkTimingStats;
  speedup: number;
  outputs_match: boolean;
  cobol_output: string;
  modern_output: string;
}

/* ---------- Per-program transform result ---------- */

interface ProgramTransformResult {
  cobolSource: string;
  modernSource: string;
  editedModernSource: string;
  fileTree: string[];
  cached: boolean;
  editIndicator: 'Original' | 'Cached' | 'Edited';
  testInput: string;
  expectedOutput: string;
  loopRunning: boolean;
  loopEvents: LoopEvent[];
  loopResult: LoopEvent | null;
}

const mono = { fontFamily: "'IBM Plex Mono', monospace" };
const sans = { fontFamily: "'IBM Plex Sans', sans-serif" };

/* ---------- Multi-file parsing ---------- */

interface ParsedFile {
  path: string;
  filename: string;
  content: string;
}

function parseModernFiles(source: string): ParsedFile[] {
  const separator = /^\/\/ === FILE: (.+?) ===$/gm;
  const matches: { path: string; index: number; fullMatchEnd: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = separator.exec(source)) !== null) {
    matches.push({
      path: match[1].trim(),
      index: match.index,
      fullMatchEnd: match.index + match[0].length,
    });
  }

  if (matches.length === 0) {
    return [{ path: 'output', filename: 'output', content: source }];
  }

  const files: ParsedFile[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].fullMatchEnd;
    const end = i + 1 < matches.length ? matches[i + 1].index : source.length;
    const raw = source.substring(start, end).replace(/^\n/, '').replace(/\n+$/, '');
    const path = matches[i].path;
    const filename = path.includes('/') ? path.split('/').pop()! : path;
    files.push({ path, filename, content: raw });
  }

  return files;
}

function reassembleModernSource(files: ParsedFile[]): string {
  if (files.length === 1 && files[0].path === 'output') return files[0].content;
  return files.map(f => `// === FILE: ${f.path} ===\n${f.content}`).join('\n\n');
}

/* ---------- Syntax highlighting (matches CodeFlux) ---------- */

function highlightCobolLine(line: string): JSX.Element {
  const trimmed = line.trimStart();

  // Comment lines (column 7 = *)
  if (line.length >= 7 && line[6] === '*') {
    return <span style={{ color: '#57634f' }}>{line}</span>;
  }

  // JCL lines
  if (trimmed.startsWith('//')) {
    return <span style={{ color: '#c9a56a' }}>{line}</span>;
  }

  // SQL
  if (trimmed.includes('EXEC SQL') || trimmed.includes('END-EXEC') ||
      trimmed.includes('INSERT INTO') || trimmed.includes('UPDATE ') ||
      trimmed.includes('SELECT ') || trimmed.includes('DELETE ') ||
      trimmed.includes('VALUES') || trimmed.includes('WHERE ') ||
      trimmed.includes('SET ') || trimmed.includes('INTO :') ||
      trimmed.includes('FROM ')) {
    return <span style={{ color: '#58b0ff' }}>{line}</span>;
  }

  // Vendor calls (ANBX)
  if (trimmed.includes('ANBX') || trimmed.includes("CALL 'ANBX")) {
    return <span style={{ color: '#d29922' }}>{line}</span>;
  }

  // DIVISION / SECTION / COPY
  if (trimmed.includes('DIVISION') || trimmed.includes('SECTION') ||
      trimmed.startsWith('COPY ') || trimmed.includes('PROGRAM-ID') ||
      trimmed.includes('EXEC CICS')) {
    return <span style={{ color: '#7de0cf' }}>{line}</span>;
  }

  return <span style={{ color: '#9fb0c6' }}>{line}</span>;
}

/* ---------- Transform cache (localStorage) ---------- */

interface CachedTransformOutput {
  commitSha: string;
  cobolSource: string;
  modernSource: string;
  fileTree: string[];
  timestamp: number; // epoch ms when cached
}

const CACHE_PREFIX = 'xform_cache:';

function buildCacheKey(repoUrl: string, branch: string, filePath: string, targetLang: string, targetDb: string): string {
  return `${CACHE_PREFIX}${repoUrl}::${branch}::${filePath}::${targetLang}::${targetDb}`;
}

function getCachedTransform(
  repoUrl: string, branch: string, filePath: string, targetLang: string, targetDb: string, currentCommitSha: string,
): CachedTransformOutput | null {
  try {
    const key = buildCacheKey(repoUrl, branch, filePath, targetLang, targetDb);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CachedTransformOutput = JSON.parse(raw);
    // Only return if the git commit SHA matches — stale cache is skipped
    if (entry.commitSha === currentCommitSha) return entry;
    // Commit changed — remove stale entry
    localStorage.removeItem(key);
  } catch {
    // Corrupted entry
  }
  return null;
}

function setCachedTransform(
  repoUrl: string, branch: string, filePath: string, targetLang: string, targetDb: string,
  commitSha: string, cobolSource: string, modernSource: string, fileTree: string[],
): void {
  try {
    const key = buildCacheKey(repoUrl, branch, filePath, targetLang, targetDb);
    const entry: CachedTransformOutput = { commitSha, cobolSource, modernSource, fileTree, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — non-fatal
  }
}

/* ---------- Helper: derive programs from sources ---------- */

function deriveProgramList(sources: SourceFile[]): ProgramEntry[] {
  return sources
    .filter(s => s.type === 'program')
    .map(s => {
      const lines = s.content.split('\n');
      const loc = lines.length;
      const sqlCount = (s.content.match(/EXEC\s+SQL/gi) || []).length;
      const callCount = (s.content.match(/\bCALL\s+/gi) || []).length;

      let complexity: 'LOW' | 'MED' | 'HIGH' = 'LOW';
      if (loc > 2000 || sqlCount > 15 || callCount > 6) complexity = 'HIGH';
      else if (loc > 500 || sqlCount > 3 || callCount > 2) complexity = 'MED';

      const baseName = s.name.replace(/\.(cbl|cob|CBL|COB)$/i, '');
      return {
        name: baseName,
        path: s.path,
        loc,
        calls: callCount,
        sql: sqlCount,
        complexity,
        content: s.content,
      };
    })
    .sort((a, b) => b.loc - a.loc);
}

export function XformWorkspace({
  repoUrl,
  branch,
  sources,
  commitSha,
  targetLang,
  targetDb,
  onBack,
}: XformWorkspaceProps) {
  const programs = deriveProgramList(sources);

  const [stage, setStage] = useState<Stage>('plan');

  // Batch transform state (replaces single-program transform state)
  const [results, setResults] = useState<Record<string, ProgramTransformResult>>({});
  const [activeTab, setActiveTab] = useState<string>(programs[0]?.path || '');
  const [batchTransforming, setBatchTransforming] = useState(false);
  const [batchDone, setBatchDone] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; current: string }>({ done: 0, total: 0, current: '' });

  // Refs
  const editTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loopAbortRef = useRef<AbortController | null>(null);

  // Parity stage state
  const [parityInputData, setParityInputData] = useState('');
  const [parityExpectedOutput, setParityExpectedOutput] = useState('');
  const [parityActualOutput, setParityActualOutput] = useState('');
  const [parityResult, setParityResult] = useState<ParityComparisonResult | null>(null);
  const [parityDone, setParityDone] = useState(false);
  const [parityShowOnlyMismatches, setParityShowOnlyMismatches] = useState(false);

  // Performance stage state
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfData, setPerfData] = useState<PerfData | null>(null);
  const [perfError, setPerfError] = useState<string | null>(null);

  // COBOL run state (used in Parity stage)
  const [cobolRunLoading, setCobolRunLoading] = useState(false);
  const [cobolRunError, setCobolRunError] = useState<string | null>(null);

  // Execution benchmark state (used in Performance stage)
  const [benchInput, setBenchInput] = useState('');
  const [benchLoading, setBenchLoading] = useState(false);
  const [benchResult, setBenchResult] = useState<BenchmarkResult | null>(null);
  const [benchError, setBenchError] = useState<string | null>(null);

  const activeResult = results[activeTab] || null;
  const activeProgram = programs.find(p => p.path === activeTab) || programs[0];

  const stages: { key: Stage; label: string }[] = [
    { key: 'plan', label: 'Plan' },
    { key: 'transform', label: 'Transform' },
    { key: 'parity', label: 'Parity Testing' },
    { key: 'performance', label: 'Performance' },
  ];

  const langLabel = targetLang === 'java' ? 'Java' : targetLang === 'csharp' ? 'C#' : targetLang === 'python' ? 'Python' : 'Microservices';

  /* ---------- Transform: fetch saved edits ---------- */

  const fetchSavedEdits = useCallback(async (program: ProgramEntry) => {
    try {
      const resp = await fetch('/api/demystifier/transform/get-edits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: repoUrl,
          branch,
          file_path: program.path,
          target_lang: targetLang,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.edits && data.edits.content) {
          return data.edits.content as string;
        }
      }
    } catch {
      // Non-fatal
    }
    return null;
  }, [repoUrl, branch, targetLang]);

  /* ---------- Batch Transform: call LLM API for all programs sequentially ---------- */
  /*
   * Caching rule: before hitting the transform API, check localStorage for a
   * cached output whose commitSha matches the current branch head.  If the SHA
   * matches the cached entry is reused (the branch hasn't moved).  If the SHA
   * differs (new commits on the branch) the stale entry is discarded and we
   * re-transform via the API, then cache the fresh result.
   */

  const handleStartBatchTransform = useCallback(async () => {
    setStage('transform');
    setBatchTransforming(true);
    setBatchDone(false);
    setBatchError(null);
    setResults({});

    for (let i = 0; i < programs.length; i++) {
      const program = programs[i];
      setBatchProgress({ done: i, total: programs.length, current: program.name });

      const savedEdits = await fetchSavedEdits(program);

      // --- Check frontend cache (commitSha match = branch unchanged) ---
      const cached = getCachedTransform(repoUrl, branch, program.path, targetLang, targetDb, commitSha);

      if (cached) {
        // Cache hit — reuse without calling the API
        const cobolSrc = cached.cobolSource;
        const modernSrc = cached.modernSource;

        let editedSrc: string;
        let indicator: 'Original' | 'Cached' | 'Edited';
        if (savedEdits) {
          editedSrc = savedEdits;
          indicator = 'Edited';
        } else {
          editedSrc = modernSrc;
          indicator = 'Cached';
        }

        setResults(prev => ({
          ...prev,
          [program.path]: {
            cobolSource: cobolSrc,
            modernSource: modernSrc,
            editedModernSource: editedSrc,
            fileTree: cached.fileTree,
            cached: true,
            editIndicator: indicator,
            testInput: '',
            expectedOutput: '',
            loopRunning: false,
            loopEvents: [],
            loopResult: null,
          },
        }));
        continue; // next program — no API call needed
      }

      // --- Cache miss or stale — call the transform API ---
      try {
        const resp = await fetch('/api/demystifier/transform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            program_content: program.content,
            file_path: program.path,
            repo_url: repoUrl,
            commit_sha: commitSha,
            branch,
            target_lang: targetLang,
            target_db: targetDb,
          }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: 'Transform failed' }));
          throw new Error(err.error || `HTTP ${resp.status}`);
        }

        const data = await resp.json();
        const cobolSrc = data.cobol_source || program.content;
        const modernSrc = data.modern_source || '';
        const apiCached = data.cached ?? false;

        // Persist to localStorage for future runs at the same commit
        setCachedTransform(repoUrl, branch, program.path, targetLang, targetDb, commitSha, cobolSrc, modernSrc, data.file_tree || []);

        let editedSrc: string;
        let indicator: 'Original' | 'Cached' | 'Edited';
        if (savedEdits) {
          editedSrc = savedEdits;
          indicator = 'Edited';
        } else {
          editedSrc = modernSrc;
          indicator = apiCached ? 'Cached' : 'Original';
        }

        setResults(prev => ({
          ...prev,
          [program.path]: {
            cobolSource: cobolSrc,
            modernSource: modernSrc,
            editedModernSource: editedSrc,
            fileTree: data.file_tree || [],
            cached: apiCached,
            editIndicator: indicator,
            testInput: '',
            expectedOutput: '',
            loopRunning: false,
            loopEvents: [],
            loopResult: null,
          },
        }));
      } catch (e) {
        // Store a placeholder result so the tab still appears, but with empty output
        setResults(prev => ({
          ...prev,
          [program.path]: {
            cobolSource: program.content,
            modernSource: '',
            editedModernSource: '',
            fileTree: [],
            cached: false,
            editIndicator: 'Original',
            testInput: '',
            expectedOutput: '',
            loopRunning: false,
            loopEvents: [],
            loopResult: null,
          },
        }));
        // Continue transforming remaining programs — don't abort the batch
      }
    }

    setBatchProgress({ done: programs.length, total: programs.length, current: '' });
    setBatchTransforming(false);
    setBatchDone(true);
    setActiveTab(programs[0]?.path || '');
  }, [programs, repoUrl, commitSha, branch, targetLang, targetDb, fetchSavedEdits]);

  /* ---------- Transform: save edits on change (debounced 2s) ---------- */

  const handleModernCodeEdit = useCallback((newCode: string) => {
    setResults(prev => {
      const current = prev[activeTab];
      if (!current) return prev;
      return {
        ...prev,
        [activeTab]: { ...current, editedModernSource: newCode, editIndicator: 'Edited' },
      };
    });

    if (editTimerRef.current) clearTimeout(editTimerRef.current);
    editTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/demystifier/transform/save-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repo_url: repoUrl,
            branch,
            file_path: activeTab,
            content: newCode,
            target_lang: targetLang,
            commit_sha: commitSha,
          }),
        });
      } catch {
        // Non-fatal save failure
      }
    }, 2000);
  }, [activeTab, repoUrl, branch, targetLang, commitSha]);

  // Cleanup edit timer on unmount
  useEffect(() => {
    return () => {
      if (editTimerRef.current) clearTimeout(editTimerRef.current);
    };
  }, []);

  /* ---------- Per-tab test input / expected output handlers ---------- */

  const handleTestInputChange = useCallback((v: string) => {
    setResults(prev => {
      const current = prev[activeTab];
      if (!current) return prev;
      return { ...prev, [activeTab]: { ...current, testInput: v } };
    });
  }, [activeTab]);

  const handleExpectedOutputChange = useCallback((v: string) => {
    setResults(prev => {
      const current = prev[activeTab];
      if (!current) return prev;
      return { ...prev, [activeTab]: { ...current, expectedOutput: v } };
    });
  }, [activeTab]);

  /* ---------- Agent Loop: transform-build-test-fix (per active tab) ---------- */

  const handleRunLoop = useCallback(async () => {
    const result = results[activeTab];
    if (!result) return;
    const program = programs.find(p => p.path === activeTab);
    if (!program) return;

    if (loopAbortRef.current) loopAbortRef.current.abort();
    const controller = new AbortController();
    loopAbortRef.current = controller;

    const tabPath = activeTab; // capture for stable closure

    setResults(prev => ({
      ...prev,
      [tabPath]: { ...prev[tabPath], loopRunning: true, loopEvents: [], loopResult: null },
    }));

    try {
      const resp = await fetch('/api/demystifier/transform/loop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_content: program.content,
          file_path: program.path,
          target_lang: targetLang,
          target_db: targetDb,
          test_input: result.testInput,
          expected_output: result.expectedOutput,
          max_iterations: 5,
        }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Loop request failed' }));
        setResults(prev => ({
          ...prev,
          [tabPath]: {
            ...prev[tabPath],
            loopEvents: [...prev[tabPath].loopEvents, { type: 'error', message: err.error || `HTTP ${resp.status}` }],
            loopRunning: false,
          },
        }));
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event: LoopEvent = JSON.parse(line);
            setResults(prev => {
              const current = prev[tabPath];
              if (!current) return prev;
              const newEvents = [...current.loopEvents, event];
              const updates: Partial<ProgramTransformResult> = { loopEvents: newEvents };
              if (event.type === 'result') {
                updates.loopResult = event;
                if (event.success && event.modern_source) {
                  updates.editedModernSource = event.modern_source;
                  updates.modernSource = event.modern_source;
                  updates.editIndicator = 'Edited';
                }
              }
              return { ...prev, [tabPath]: { ...current, ...updates } };
            });
          } catch {
            // skip malformed lines
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const event: LoopEvent = JSON.parse(buffer);
          setResults(prev => {
            const current = prev[tabPath];
            if (!current) return prev;
            const newEvents = [...current.loopEvents, event];
            const updates: Partial<ProgramTransformResult> = { loopEvents: newEvents };
            if (event.type === 'result') {
              updates.loopResult = event;
              if (event.success && event.modern_source) {
                updates.editedModernSource = event.modern_source;
                updates.modernSource = event.modern_source;
                updates.editIndicator = 'Edited';
              }
            }
            return { ...prev, [tabPath]: { ...current, ...updates } };
          });
        } catch {
          // skip
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setResults(prev => ({
        ...prev,
        [tabPath]: {
          ...prev[tabPath],
          loopEvents: [...prev[tabPath].loopEvents, {
            type: 'error',
            message: e instanceof Error ? e.message : 'Unknown error',
          }],
        },
      }));
    } finally {
      if (!controller.signal.aborted) {
        setResults(prev => ({
          ...prev,
          [tabPath]: { ...prev[tabPath], loopRunning: false },
        }));
      }
    }
  }, [activeTab, results, programs, targetLang, targetDb]);

  // Cleanup loop abort on unmount
  useEffect(() => {
    return () => {
      if (loopAbortRef.current) loopAbortRef.current.abort();
    };
  }, []);

  /* ---------- Parity: compare expected vs actual output ---------- */

  const handleRunParity = useCallback(() => {
    const result = runParityComparison(parityExpectedOutput, parityActualOutput);
    setParityResult(result);
    setParityDone(true);
  }, [parityExpectedOutput, parityActualOutput]);

  const handleResetParity = useCallback(() => {
    setParityResult(null);
    setParityDone(false);
  }, []);

  const handleRunCobol = useCallback(async () => {
    const program = programs.find(p => p.path === activeTab);
    if (!program) return;

    setCobolRunLoading(true);
    setCobolRunError(null);
    try {
      const res = await fetch('/api/demystifier/cobol-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cobol_source: program.content,
          test_input: parityInputData,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `API returned ${res.status}`);
      }
      if (!data.success) {
        throw new Error(data.build_errors || data.stderr || 'COBOL run failed');
      }
      setParityExpectedOutput(data.stdout);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setCobolRunError(msg);
    } finally {
      setCobolRunLoading(false);
    }
  }, [activeTab, programs, parityInputData]);

  const handleProceedToPerformance = useCallback(() => {
    setStage('performance');
    setPerfData(null);
    setPerfError(null);
  }, []);

  /* ---------- Performance: call real LLM perf-eval (uses active tab) ---------- */

  const handleRunPerfEval = useCallback(async () => {
    const result = results[activeTab];
    const program = programs.find(p => p.path === activeTab);
    if (!result || !program) return;

    setPerfLoading(true);
    setPerfError(null);
    try {
      const res = await fetch('/api/demystifier/perf-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cobol_source: result.cobolSource || program.content,
          modern_source: result.editedModernSource || result.modernSource,
          target_lang: langLabel,
          program_name: program.name,
        }),
      });
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }
      const data: PerfData = await res.json();
      setPerfData(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setPerfError(msg);
    } finally {
      setPerfLoading(false);
    }
  }, [activeTab, results, programs, langLabel]);

  /* ---------- Execution benchmark ---------- */

  const handleRunBenchmark = useCallback(async () => {
    const result = results[activeTab];
    const program = programs.find(p => p.path === activeTab);
    if (!result || !program) return;

    setBenchLoading(true);
    setBenchError(null);
    try {
      const res = await fetch('/api/demystifier/perf-benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cobol_source: result.cobolSource || program.content,
          modern_source: result.editedModernSource || result.modernSource,
          target_lang: targetLang,
          test_input: benchInput,
          iterations: 5,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `API returned ${res.status}` }));
        throw new Error(errData.error || errData.build_errors || `API returned ${res.status}`);
      }
      const data: BenchmarkResult = await res.json();
      setBenchResult(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setBenchError(msg);
    } finally {
      setBenchLoading(false);
    }
  }, [activeTab, results, programs, targetLang, benchInput]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sub-header with back + stepper */}
      <div className="flex items-center gap-4 px-5 py-3 bg-[#0c1018] border-b border-[#1e2736]">
        <button
          onClick={onBack}
          className="text-[11px] text-[#7a869a] hover:text-[#dbe4f0] transition-colors"
          style={mono}
        >
          {'\u2190'} Back
        </button>
        <div className="flex-1 flex items-center justify-center gap-1">
          {stages.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (s.key === 'plan') setStage('plan');
                  if (s.key === 'transform' && stage !== 'plan') setStage('transform');
                  if (s.key === 'parity' && batchDone) setStage('parity');
                  if (s.key === 'performance' && parityDone) setStage('performance');
                }}
                className={`px-3 py-1 text-[11px] rounded-md transition-colors ${
                  stage === s.key
                    ? 'bg-[#182233] text-[#45c4b0] border border-[#45c4b0]/30'
                    : 'text-[#5b6577] hover:text-[#9fb0c6]'
                }`}
                style={mono}
              >
                {i + 1}. {s.label}
              </button>
              {i < stages.length - 1 && (
                <span className="text-[#2a3140] text-xs">{'\u2192'}</span>
              )}
            </div>
          ))}
        </div>
        <div className="text-[10px] text-[#5b6577]" style={mono}>
          {langLabel} / {targetDb}
        </div>
      </div>

      {/* Stage content */}
      {/* Transform stage gets a full-height overflow-hidden container (IDE layout) */}
      {stage === 'transform' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <TransformStage
            programs={programs}
            results={results}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            batchTransforming={batchTransforming}
            batchProgress={batchProgress}
            batchDone={batchDone}
            langLabel={langLabel}
            onModernCodeEdit={handleModernCodeEdit}
            onProceedToParity={() => setStage('parity')}
            onTestInputChange={handleTestInputChange}
            onExpectedOutputChange={handleExpectedOutputChange}
            onRunLoop={handleRunLoop}
          />
        </div>
      )}
      {/* Other stages keep padded scrollable container */}
      <div className={`flex-1 overflow-auto p-5 ${stage === 'transform' ? 'hidden' : ''}`}>
        {stage === 'plan' && (
          <PlanStage
            programs={programs}
            onStartBatchTransform={handleStartBatchTransform}
          />
        )}
        {stage === 'parity' && (
          <ParityStage
            inputData={parityInputData}
            expectedOutput={parityExpectedOutput}
            actualOutput={parityActualOutput}
            onInputDataChange={setParityInputData}
            onExpectedOutputChange={setParityExpectedOutput}
            onActualOutputChange={setParityActualOutput}
            onRunComparison={handleRunParity}
            onReset={handleResetParity}
            comparisonResult={parityResult}
            done={parityDone}
            showOnlyMismatches={parityShowOnlyMismatches}
            onToggleMismatchFilter={setParityShowOnlyMismatches}
            langLabel={langLabel}
            onProceedToPerformance={handleProceedToPerformance}
            onRunCobol={handleRunCobol}
            cobolRunLoading={cobolRunLoading}
            cobolRunError={cobolRunError}
          />
        )}
        {stage === 'performance' && (
          <PerformanceStage
            perfData={perfData}
            perfLoading={perfLoading}
            perfError={perfError}
            langLabel={langLabel}
            onRunLLMAnalysis={handleRunPerfEval}
            programName={activeProgram?.name || ''}
            benchInput={benchInput}
            onBenchInputChange={setBenchInput}
            benchLoading={benchLoading}
            benchResult={benchResult}
            benchError={benchError}
            onRunBenchmark={handleRunBenchmark}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Plan Stage ---------- */

function PlanStage({
  programs,
  onStartBatchTransform,
}: {
  programs: ProgramEntry[];
  onStartBatchTransform: () => void;
}) {
  if (programs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto mt-12 text-center">
        <p className="text-[13px] text-[#7a869a]" style={sans}>
          No COBOL program files (.cbl, .cob) found in the repository sources.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-[14px] font-semibold text-[#e6edf7] mb-1" style={mono}>
        Programs to Transform
      </h2>
      <p className="text-[11px] text-[#7a869a] mb-4" style={sans}>
        All programs will be transformed sequentially. Complexity is computed from LOC, call depth, and SQL density.
      </p>

      {/* Read-only summary table */}
      <div className="bg-[#0c1018] border border-[#1e2736] rounded-xl overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e2736]">
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#5b6577] uppercase tracking-wider" style={mono}>Program</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#5b6577] uppercase tracking-wider" style={mono}>Path</th>
              <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-[#5b6577] uppercase tracking-wider" style={mono}>LOC</th>
              <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-[#5b6577] uppercase tracking-wider" style={mono}>Calls</th>
              <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-[#5b6577] uppercase tracking-wider" style={mono}>SQL</th>
              <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-[#5b6577] uppercase tracking-wider" style={mono}>Complexity</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((p) => (
              <tr key={p.path} className="border-b border-[#1e2736]/50 last:border-b-0">
                <td className="px-4 py-3">
                  <span className="text-[12px] font-semibold text-[#dbe4f0]" style={mono}>{p.name}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px] text-[#5b6577] truncate block max-w-[200px]" style={mono}>{p.path}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-[11px] text-[#9fb0c6]" style={mono}>{p.loc.toLocaleString()}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-[11px] text-[#9fb0c6]" style={mono}>{p.calls}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-[11px] text-[#9fb0c6]" style={mono}>{p.sql}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded inline-block"
                    style={{
                      ...mono,
                      color: COMPLEXITY_COLORS[p.complexity],
                      backgroundColor: COMPLEXITY_COLORS[p.complexity] + '15',
                    }}
                  >
                    {p.complexity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onStartBatchTransform}
          className="px-5 py-2 text-[12px] font-semibold rounded-lg bg-[#45c4b0] text-[#0a0e14] hover:bg-[#3db3a0] transition-colors"
          style={mono}
        >
          Transform All {programs.length} Program{programs.length !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}

/* ---------- Transform Stage ---------- */

function TransformStage({
  programs,
  results,
  activeTab,
  onTabChange,
  batchTransforming,
  batchProgress,
  batchDone,
  langLabel,
  onModernCodeEdit,
  onProceedToParity,
  onTestInputChange,
  onExpectedOutputChange,
  onRunLoop,
}: {
  programs: ProgramEntry[];
  results: Record<string, ProgramTransformResult>;
  activeTab: string;
  onTabChange: (path: string) => void;
  batchTransforming: boolean;
  batchProgress: { done: number; total: number; current: string };
  batchDone: boolean;
  langLabel: string;
  onModernCodeEdit: (code: string) => void;
  onProceedToParity: () => void;
  onTestInputChange: (v: string) => void;
  onExpectedOutputChange: (v: string) => void;
  onRunLoop: () => void;
}) {
  const activeResult = results[activeTab] || null;
  const activeProgram = programs.find(p => p.path === activeTab);

  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Reset file index when program tab changes
  useEffect(() => {
    setActiveFileIndex(0);
  }, [activeTab]);

  const parsedFiles = useMemo(
    () => activeResult ? parseModernFiles(activeResult.editedModernSource) : [],
    [activeResult?.editedModernSource]
  );
  const activeFile = parsedFiles[activeFileIndex] || parsedFiles[0];
  const isMultiFile = parsedFiles.length > 1;

  const handleFileEdit = useCallback((newContent: string) => {
    const updated = parsedFiles.map((f, i) =>
      i === activeFileIndex ? { ...f, content: newContent } : f
    );
    onModernCodeEdit(reassembleModernSource(updated));
  }, [parsedFiles, activeFileIndex, onModernCodeEdit]);

  // While batch is running, show progress card (centered with padding)
  if (batchTransforming) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center px-5">
        <div className="inline-block w-8 h-8 border-2 border-[#45c4b0] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-[14px] font-semibold text-[#e6edf7] mb-2" style={mono}>
          Transforming {batchProgress.done + 1} of {batchProgress.total} programs
        </h2>
        <p className="text-[11px] text-[#7a869a] mb-6" style={sans}>
          Currently transforming <span className="text-[#dbe4f0] font-semibold" style={mono}>{batchProgress.current}</span>
          {' '}&mdash; analyzing call graph, extracting SQL, mapping to {langLabel} idioms...
        </p>

        {/* Progress bar */}
        <div className="w-full bg-[#111823] rounded-full h-2 border border-[#1e2736] overflow-hidden mb-3">
          <div
            className="h-full bg-[#45c4b0] rounded-full transition-all duration-300"
            style={{ width: `${batchProgress.total > 0 ? Math.round((batchProgress.done / batchProgress.total) * 100) : 0}%` }}
          />
        </div>
        <p className="text-[11px] text-[#5b6577]" style={mono}>
          {batchProgress.done} / {batchProgress.total} complete
        </p>

        {/* Completed tabs preview */}
        {batchProgress.done > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {programs.slice(0, batchProgress.done).map(p => {
              const wasCached = results[p.path]?.cached;
              return (
                <span
                  key={p.path}
                  className={`px-3 py-1 text-[10px] rounded-md border ${
                    wasCached
                      ? 'bg-[#182233] text-[#60a5fa] border-[#60a5fa]/20'
                      : 'bg-[#182233] text-[#45c4b0] border-[#45c4b0]/20'
                  }`}
                  style={mono}
                >
                  {wasCached ? '\u21BB' : '\u2713'} {p.name}{wasCached ? ' (cached)' : ''}
                </span>
              );
            })}
            {programs.slice(batchProgress.done).map(p => (
              <span
                key={p.path}
                className="px-3 py-1 text-[10px] rounded-md bg-[#111823] text-[#5b6577] border border-[#1e2736]"
                style={mono}
              >
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!batchDone || !activeResult || !activeProgram) {
    return null;
  }

  const cobolLines = activeResult.cobolSource.split('\n');
  const cobolLoc = cobolLines.length;
  const modernContent = activeFile ? activeFile.content : activeResult.editedModernSource;
  const modernLines = modernContent.split('\n');
  const modernLoc = modernLines.length;

  const indicatorColors = {
    Original: { bg: 'bg-[#45c4b0]/10', border: 'border-[#45c4b0]/30', text: 'text-[#45c4b0]' },
    Cached: { bg: 'bg-[#60a5fa]/10', border: 'border-[#60a5fa]/30', text: 'text-[#60a5fa]' },
    Edited: { bg: 'bg-[#fbbf24]/10', border: 'border-[#fbbf24]/30', text: 'text-[#fbbf24]' },
  };
  const ic = indicatorColors[activeResult.editIndicator];

  return (
    <div className="flex flex-col h-full">
      {/* ── Tab bar ────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-0 bg-[#0c1018] border-b border-[#1e2736] shrink-0">
        <div className="flex items-center gap-0">
          {programs.map(p => {
            const hasResult = !!results[p.path];
            const isActive = p.path === activeTab;
            const pResult = results[p.path];
            const isEdited = pResult?.editIndicator === 'Edited';
            return (
              <button
                key={p.path}
                onClick={() => hasResult && onTabChange(p.path)}
                disabled={!hasResult}
                className={`px-4 py-2.5 text-[11px] border-b-2 transition-colors ${
                  isActive
                    ? 'bg-[#0a0e14] text-[#e6edf7] border-[#45c4b0]'
                    : hasResult
                      ? 'text-[#7a869a] border-transparent hover:text-[#9fb0c6] hover:bg-[#111823]'
                      : 'text-[#3a4456] border-transparent cursor-not-allowed'
                }`}
                style={mono}
              >
                {p.name}
                {isEdited && <span className="ml-1.5 text-[#fbbf24]">{'\u2022'}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${ic.bg} ${ic.border} ${ic.text}`} style={mono}>
            {activeResult.editIndicator}{activeResult.cached && activeResult.editIndicator === 'Cached' ? ' (from cache)' : ''}
          </span>
          <button
            onClick={onProceedToParity}
            className="px-4 py-1.5 text-[11px] font-semibold rounded-md bg-[#45c4b0] text-[#0a0e14] hover:bg-[#3db3a0] transition-colors"
            style={mono}
          >
            Proceed to Parity {'\u2192'}
          </button>
        </div>
      </div>

      {/* ── Code panels (flex-1, two-pane with divider) ─── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* LEFT: COBOL Source (read-only, CodeFlux-style) */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#1e2736]">
          {/* File tab bar */}
          <div className="flex items-center h-9 px-3 bg-[#0c1018] border-b border-[#1e2736] shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#f97316] mr-2 shrink-0" />
            <span className="text-[11px] text-[#9fb0c6] truncate" style={mono}>
              {activeProgram.path}
            </span>
            <span className="text-[10px] text-[#5b6577] ml-3 shrink-0" style={mono}>
              {cobolLoc.toLocaleString()} LOC
            </span>
          </div>
          {/* Code content */}
          <div className="flex-1 overflow-auto bg-[#0a0e14]">
            <pre className="text-[12px] leading-[1.6]" style={mono}>
              <code>
                {cobolLines.map((line, i) => (
                  <div key={i} className="flex hover:bg-[#111823]">
                    <span
                      className="inline-block w-12 text-right pr-4 select-none shrink-0"
                      style={{ color: '#3a4250' }}
                    >
                      {i + 1}
                    </span>
                    {highlightCobolLine(line)}
                  </div>
                ))}
              </code>
            </pre>
          </div>
        </div>

        {/* RIGHT: Modern Output (editable, CodeFlux-style) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* File tab bar */}
          <div className="flex items-center justify-between bg-[#0c1018] border-b border-[#1e2736] shrink-0" style={{ minHeight: 36 }}>
            {isMultiFile ? (
              <>
                <div className="flex items-center min-w-0 overflow-x-auto gap-0 flex-1" style={{ scrollbarWidth: 'none' }}>
                  <span className="w-2 h-2 rounded-full bg-[#45c4b0] mx-2 shrink-0" />
                  {parsedFiles.map((f, i) => (
                    <button
                      key={f.path}
                      title={f.path}
                      onClick={() => setActiveFileIndex(i)}
                      className={`px-3 py-2 text-[11px] border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                        i === activeFileIndex
                          ? 'text-[#e6edf7] border-[#45c4b0] bg-[#0a0e14]'
                          : 'text-[#7a869a] border-transparent hover:text-[#9fb0c6] hover:bg-[#111823]'
                      }`}
                      style={mono}
                    >
                      {f.filename}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 px-3 shrink-0">
                  <span className="text-[10px] text-[#5b6577]" style={mono}>
                    {modernLoc.toLocaleString()} LOC
                  </span>
                  <span className="text-[9px] text-[#5b6577] bg-[#111823] px-1.5 py-0.5 rounded" style={mono}>
                    {parsedFiles.length} files
                  </span>
                  <span className="text-[9px] text-[#5b6577]" style={mono}>editable</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center min-w-0 px-3">
                  <span className="w-2 h-2 rounded-full bg-[#45c4b0] mr-2 shrink-0" />
                  <span className="text-[11px] text-[#9fb0c6] truncate" style={mono}>
                    {langLabel} Output
                  </span>
                  <span className="text-[10px] text-[#5b6577] ml-3 shrink-0" style={mono}>
                    {modernLoc.toLocaleString()} LOC
                  </span>
                </div>
                <span className="text-[9px] text-[#5b6577] shrink-0 px-3" style={mono}>editable</span>
              </>
            )}
          </div>
          {/* Editable code with line numbers */}
          <div className="flex-1 flex min-h-0 overflow-hidden bg-[#0a0e14]">
            {/* Line numbers gutter */}
            <div className="overflow-hidden shrink-0 select-none pt-0">
              <div className="text-[12px] leading-[1.6]" style={mono}>
                {modernLines.map((_, i) => (
                  <div
                    key={i}
                    className="w-12 text-right pr-4"
                    style={{ color: '#3a4250' }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
            {/* Textarea */}
            <textarea
              value={modernContent}
              onChange={e => isMultiFile ? handleFileEdit(e.target.value) : onModernCodeEdit(e.target.value)}
              className="flex-1 bg-transparent text-[12px] text-[#9fb0c6] leading-[1.6] resize-none focus:outline-none p-0 m-0 border-none"
              style={{ ...mono, tabSize: 4 }}
              spellCheck={false}
              wrap="off"
            />
          </div>
        </div>
      </div>

      {/* ── Results panel (below the code) ─────────────── */}
      <div className="shrink-0 border-t border-[#1e2736] bg-[#0c1018]">
        {/* Results header */}
        <div className="flex items-center px-4 py-2 border-b border-[#1e2736]">
          <span className="text-[10px] text-[#5b6577] uppercase tracking-wider font-semibold" style={mono}>
            Results
          </span>
          <span className="text-[10px] text-[#3a4456] mx-2" style={mono}>&mdash;</span>
          <span className="text-[10px] text-[#5b6577]" style={mono}>
            {activeProgram.name} {'\u2192'} {langLabel}
          </span>
        </div>

        <div className="flex divide-x divide-[#1e2736]">
          {/* Left: File tree */}
          <div className="w-[280px] shrink-0 px-4 py-3 max-h-[220px] overflow-y-auto">
            <span className="text-[10px] text-[#5b6577] uppercase tracking-wider font-semibold block mb-2" style={mono}>
              Generated Package Structure
            </span>
            {activeResult.fileTree.length > 0 ? (
              <div className="text-[11px] text-[#9fb0c6] leading-relaxed" style={mono}>
                {activeResult.fileTree.map((line, i) => {
                  const fileIdx = parsedFiles.findIndex(f => f.path === line);
                  const isClickable = fileIdx >= 0;
                  const isActiveFile = fileIdx === activeFileIndex;
                  return (
                    <div
                      key={i}
                      className={`whitespace-pre px-1 -mx-1 rounded ${
                        isActiveFile ? 'bg-[#45c4b0]/10' : 'hover:bg-[#111823]'
                      } ${isClickable ? 'cursor-pointer' : ''}`}
                      onClick={() => { if (isClickable) setActiveFileIndex(fileIdx); }}
                    >
                      {line.includes('/') || line.includes('\\') ? (
                        <span className={isActiveFile ? 'text-[#45c4b0]' : 'text-[#60a5fa]'}>{line}</span>
                      ) : (
                        <span>{line}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-[#3a4456]" style={mono}>No file tree available</p>
            )}
          </div>

          {/* Right: Verification loop */}
          <div className="flex-1 px-4 py-3 max-h-[220px] overflow-y-auto">
            <span className="text-[10px] text-[#5b6577] uppercase tracking-wider font-semibold block mb-2" style={mono}>
              Verification Loop
            </span>

            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <label className="block text-[9px] text-[#5b6577] mb-1 uppercase tracking-wider" style={mono}>
                  Test Input (stdin)
                </label>
                <textarea
                  value={activeResult.testInput}
                  onChange={e => onTestInputChange(e.target.value)}
                  disabled={activeResult.loopRunning}
                  placeholder="Pipe-delimited records, one per line"
                  className="w-full h-20 p-2 text-[11px] text-[#9fb0c6] bg-[#111823] border border-[#232c3c] rounded-md resize-none focus:outline-none focus:border-[#45c4b0] disabled:opacity-50 placeholder-[#4a5568]"
                  style={mono}
                  spellCheck={false}
                />
              </div>
              <div className="flex-1">
                <label className="block text-[9px] text-[#5b6577] mb-1 uppercase tracking-wider" style={mono}>
                  Expected Output (stdout)
                </label>
                <textarea
                  value={activeResult.expectedOutput}
                  onChange={e => onExpectedOutputChange(e.target.value)}
                  disabled={activeResult.loopRunning}
                  placeholder="Expected stdout, one record per line"
                  className="w-full h-20 p-2 text-[11px] text-[#9fb0c6] bg-[#111823] border border-[#232c3c] rounded-md resize-none focus:outline-none focus:border-[#45c4b0] disabled:opacity-50 placeholder-[#4a5568]"
                  style={mono}
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-col justify-end shrink-0">
                {!activeResult.loopRunning && !activeResult.loopResult && (
                  <button
                    onClick={onRunLoop}
                    disabled={!activeResult.testInput.trim() || !activeResult.expectedOutput.trim()}
                    className="px-4 py-2 text-[11px] font-semibold rounded-md bg-[#60a5fa] text-[#0a0e14] hover:bg-[#4f8fe8] transition-colors disabled:opacity-40 whitespace-nowrap"
                    style={mono}
                  >
                    Run Loop
                  </button>
                )}
                {!activeResult.loopRunning && activeResult.loopResult && (
                  <button
                    onClick={onRunLoop}
                    disabled={!activeResult.testInput.trim() || !activeResult.expectedOutput.trim()}
                    className={`px-4 py-2 text-[11px] font-semibold rounded-md border transition-colors whitespace-nowrap ${
                      activeResult.loopResult.success
                        ? 'border-[#4ade80]/30 text-[#4ade80] hover:bg-[#4ade80]/10'
                        : 'border-[#f87171]/30 text-[#f87171] hover:bg-[#f87171]/10'
                    }`}
                    style={mono}
                  >
                    Run Again
                  </button>
                )}
              </div>
            </div>

            {/* Loop running indicator */}
            {activeResult.loopRunning && (() => {
              const latestStatus = [...activeResult.loopEvents].reverse().find(e => e.type === 'status');
              const latestIterStart = [...activeResult.loopEvents].reverse().find(e => e.type === 'iteration_start');
              const currentIter = latestIterStart?.iteration ?? 0;
              const maxIter = latestIterStart?.max_iterations ?? 5;
              return (
                <div className="flex items-center gap-3 p-3 bg-[#111823] border border-[#232c3c] rounded-md">
                  <div className="w-4 h-4 border-2 border-[#60a5fa] border-t-transparent rounded-full animate-spin shrink-0" />
                  <div>
                    <span className="text-[11px] font-semibold text-[#e6edf7]" style={mono}>
                      Running
                    </span>
                    {currentIter > 0 && (
                      <span className="text-[10px] text-[#9fb0c6] ml-2" style={mono}>
                        Iteration {currentIter}/{maxIter}
                      </span>
                    )}
                    {latestStatus?.message && (
                      <span className="text-[10px] text-[#7a869a] ml-2" style={mono}>
                        {latestStatus.message}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Loop result */}
            {!activeResult.loopRunning && activeResult.loopResult && (
              <div className={`flex items-center gap-2 p-3 rounded-md border ${
                activeResult.loopResult.success
                  ? 'bg-[#4ade80]/10 border-[#4ade80]/30'
                  : 'bg-[#f87171]/10 border-[#f87171]/30'
              }`}>
                <span className={`text-[14px] ${activeResult.loopResult.success ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                  {activeResult.loopResult.success ? '\u2713' : '\u2717'}
                </span>
                <div>
                  <span className={`text-[11px] font-semibold ${activeResult.loopResult.success ? 'text-[#4ade80]' : 'text-[#f87171]'}`} style={mono}>
                    {activeResult.loopResult.success ? 'Passed' : 'Failed'}
                  </span>
                  <span className="text-[10px] text-[#9fb0c6] ml-2" style={sans}>
                    {activeResult.loopResult.iterations} iteration{activeResult.loopResult.iterations !== 1 ? 's' : ''}
                    {activeResult.loopResult.reason && activeResult.loopResult.reason !== 'match'
                      ? ` \u2014 ${activeResult.loopResult.reason.replace(/_/g, ' ')}`
                      : ''}
                  </span>
                  {activeResult.loopResult.success && (
                    <span className="text-[9px] text-[#7a869a] ml-2" style={sans}>
                      Verified code applied to editor
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Loop Event Row ---------- */

function LoopEventRow({ event, langLabel }: { event: LoopEvent; langLabel: string }) {
  if (event.type === 'iteration_start') {
    return (
      <div className="text-[10px] text-[#60a5fa] font-semibold pt-2" style={mono}>
        --- Iteration {event.iteration}/{event.max_iterations} ---
      </div>
    );
  }

  const stepIcons: Record<string, string> = {
    transforming: '\u25B6',
    fixing: '\u21BB',
    generated: '\u2713',
    building: '\u2692',
    built: '\u2713',
    build_failed: '\u2717',
    running: '\u25B6',
    ran: '\u2713',
    run_failed: '\u2717',
    comparing: '\u2194',
    match: '\u2713',
    mismatch: '\u2260',
  };

  const stepColors: Record<string, string> = {
    transforming: '#9fb0c6',
    fixing: '#fbbf24',
    generated: '#4ade80',
    building: '#9fb0c6',
    built: '#4ade80',
    build_failed: '#f87171',
    running: '#9fb0c6',
    ran: '#4ade80',
    run_failed: '#f87171',
    comparing: '#9fb0c6',
    match: '#4ade80',
    mismatch: '#f87171',
  };

  const step = event.step || '';
  const icon = stepIcons[step] || '\u2022';
  const color = stepColors[step] || '#9fb0c6';

  return (
    <div>
      <div className="flex items-start gap-2">
        <span className="text-[10px] shrink-0 w-4 text-center" style={{ ...mono, color }}>{icon}</span>
        <span className="text-[10px]" style={{ ...mono, color }}>{event.message}</span>
      </div>
      {event.errors && (
        <pre className="ml-6 mt-1 text-[9px] text-[#f87171] bg-[#111823] rounded p-2 overflow-x-auto max-h-24" style={mono}>
          {event.errors.slice(0, 1500)}
        </pre>
      )}
      {event.diff && (
        <pre className="ml-6 mt-1 text-[9px] text-[#fbbf24] bg-[#111823] rounded p-2 overflow-x-auto max-h-24" style={mono}>
          {event.diff.slice(0, 1500)}
        </pre>
      )}
    </div>
  );
}

/* ---------- Parity Stage ---------- */

function handleFileRead(setter: (v: string) => void) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setter(reader.result);
    };
    reader.readAsText(file);
    e.target.value = ''; // reset so same file can be re-selected
  };
}

function ParityStage({
  inputData,
  expectedOutput,
  actualOutput,
  onInputDataChange,
  onExpectedOutputChange,
  onActualOutputChange,
  onRunComparison,
  onReset,
  comparisonResult,
  done,
  showOnlyMismatches,
  onToggleMismatchFilter,
  langLabel,
  onProceedToPerformance,
  onRunCobol,
  cobolRunLoading,
  cobolRunError,
}: {
  inputData: string;
  expectedOutput: string;
  actualOutput: string;
  onInputDataChange: (v: string) => void;
  onExpectedOutputChange: (v: string) => void;
  onActualOutputChange: (v: string) => void;
  onRunComparison: () => void;
  onReset: () => void;
  comparisonResult: ParityComparisonResult | null;
  done: boolean;
  showOnlyMismatches: boolean;
  onToggleMismatchFilter: (v: boolean) => void;
  langLabel: string;
  onProceedToPerformance: () => void;
  onRunCobol: () => void;
  cobolRunLoading: boolean;
  cobolRunError: string | null;
}) {
  const canCompare = expectedOutput.trim().length > 0 && actualOutput.trim().length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[14px] font-semibold text-[#e6edf7]" style={mono}>
          Parity Testing
        </h2>
        {done && (
          <button
            onClick={onProceedToPerformance}
            className="px-4 py-1.5 text-[11px] font-semibold rounded-lg bg-[#45c4b0] text-[#0a0e14] hover:bg-[#3db3a0] transition-colors"
            style={mono}
          >
            Proceed to Performance Evaluation {'\u2192'}
          </button>
        )}
      </div>
      <p className="text-[11px] text-[#7a869a] mb-5" style={sans}>
        Provide test input, expected output (from COBOL), and actual output (from {langLabel}).
        Compare line-by-line to verify output parity.
      </p>

      {/* Three input panels */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* Input Records */}
        <ParityFilePanel
          label="Input Records"
          sublabel="Test data fed to both programs"
          value={inputData}
          onChange={onInputDataChange}
          onFileRead={handleFileRead(onInputDataChange)}
          disabled={false}
          color="#60a5fa"
        />

        {/* Expected Output */}
        <div className="flex flex-col">
          <ParityFilePanel
            label="Expected Output"
            sublabel="Golden reference (COBOL output)"
            value={expectedOutput}
            onChange={onExpectedOutputChange}
            onFileRead={handleFileRead(onExpectedOutputChange)}
            disabled={false}
            color="#f97316"
          />
          <button
            onClick={onRunCobol}
            disabled={cobolRunLoading}
            className="mt-2 px-3 py-1.5 text-[10px] font-semibold rounded-md border border-[#f97316]/30 text-[#f97316] hover:bg-[#f97316]/10 transition-colors disabled:opacity-40 flex items-center gap-1.5 self-start"
            style={mono}
          >
            {cobolRunLoading ? (
              <>
                <span className="inline-block w-3 h-3 border border-[#f97316] border-t-transparent rounded-full animate-spin" />
                Running COBOL...
              </>
            ) : (
              'Run COBOL'
            )}
          </button>
          {cobolRunError && (
            <p className="mt-1 text-[10px] text-[#f87171]" style={mono}>
              {cobolRunError}
            </p>
          )}
        </div>

        {/* Actual Output */}
        <ParityFilePanel
          label="Actual Output"
          sublabel={`${langLabel} program output`}
          value={actualOutput}
          onChange={onActualOutputChange}
          onFileRead={handleFileRead(onActualOutputChange)}
          disabled={false}
          color="#45c4b0"
        />
      </div>

      {/* Compare / Reset buttons */}
      <div className="flex items-center gap-3 mb-6">
        {!done ? (
          <button
            onClick={onRunComparison}
            disabled={!canCompare}
            className="px-5 py-2 text-[12px] font-semibold rounded-lg bg-[#45c4b0] text-[#0a0e14] hover:bg-[#3db3a0] transition-colors disabled:opacity-40"
            style={mono}
          >
            Compare Outputs
          </button>
        ) : (
          <button
            onClick={onReset}
            className="px-5 py-2 text-[12px] font-semibold rounded-lg border border-[#45c4b0]/30 text-[#45c4b0] hover:bg-[#45c4b0]/10 transition-colors"
            style={mono}
          >
            Reset &amp; Edit
          </button>
        )}
        {!canCompare && !done && (
          <span className="text-[10px] text-[#5b6577]" style={mono}>
            Paste or upload both expected and actual output to compare
          </span>
        )}
      </div>

      {/* Comparison Results */}
      {done && comparisonResult && (
        <div className="bg-[#0c1018] border border-[#1e2736] rounded-xl overflow-hidden">
          {/* Summary stats bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2736]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[16px] text-[#4ade80]">{comparisonResult.mismatchCount === 0 ? '\u2713' : ''}</span>
                <span className="text-[13px] font-semibold text-[#e6edf7]" style={mono}>
                  {comparisonResult.mismatchCount === 0 ? 'Full Parity' : 'Mismatches Found'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px]" style={mono}>
                  <span className="text-[#4ade80] font-semibold">{comparisonResult.matchCount.toLocaleString()}</span>
                  <span className="text-[#5b6577]"> match</span>
                </span>
                {comparisonResult.mismatchCount > 0 && (
                  <span className="text-[11px]" style={mono}>
                    <span className="text-[#f87171] font-semibold">{comparisonResult.mismatchCount.toLocaleString()}</span>
                    <span className="text-[#5b6577]"> mismatch</span>
                  </span>
                )}
                <span className="text-[11px]" style={mono}>
                  <span className="text-[#9fb0c6]">{comparisonResult.totalLines.toLocaleString()}</span>
                  <span className="text-[#5b6577]"> total</span>
                </span>
              </div>
            </div>
            {comparisonResult.mismatchCount > 0 && (
              <button
                onClick={() => onToggleMismatchFilter(!showOnlyMismatches)}
                className={`px-3 py-1 text-[10px] rounded-md border transition-colors ${
                  showOnlyMismatches
                    ? 'bg-[#f87171]/10 border-[#f87171]/30 text-[#f87171]'
                    : 'border-[#232c3c] text-[#7a869a] hover:text-[#9fb0c6]'
                }`}
                style={mono}
              >
                {showOnlyMismatches ? 'Show all' : 'Show mismatches only'}
              </button>
            )}
          </div>

          {/* Parity progress bar */}
          <div className="px-4 py-2 border-b border-[#1e2736]">
            <div className="w-full bg-[#111823] rounded-full h-1.5 overflow-hidden flex">
              {comparisonResult.matchCount > 0 && (
                <div
                  className="h-full bg-[#4ade80]"
                  style={{ width: `${(comparisonResult.matchCount / comparisonResult.totalLines) * 100}%` }}
                />
              )}
              {comparisonResult.mismatchCount > 0 && (
                <div
                  className="h-full bg-[#f87171]"
                  style={{ width: `${(comparisonResult.mismatchCount / comparisonResult.totalLines) * 100}%` }}
                />
              )}
            </div>
          </div>

          {/* Diff table */}
          <div className="max-h-[400px] overflow-auto">
            <table className="w-full text-[11px]" style={mono}>
              <thead className="sticky top-0 bg-[#0c1018] z-10">
                <tr className="border-b border-[#1e2736]">
                  <th className="text-left px-3 py-2 text-[10px] text-[#5b6577] font-semibold w-12">#</th>
                  <th className="text-left px-3 py-2 text-[10px] text-[#5b6577] font-semibold w-10"></th>
                  <th className="text-left px-3 py-2 text-[10px] text-[#f97316] font-semibold">Expected</th>
                  <th className="text-left px-3 py-2 text-[10px] text-[#45c4b0] font-semibold">Actual</th>
                </tr>
              </thead>
              <tbody>
                {comparisonResult.diffs
                  .filter(d => !showOnlyMismatches || d.status !== 'match')
                  .map(d => {
                    const isMismatch = d.status !== 'match';
                    return (
                      <tr
                        key={d.lineNum}
                        className={`border-b border-[#1e2736]/30 ${
                          isMismatch ? 'bg-[#f87171]/5' : 'hover:bg-[#111823]'
                        }`}
                      >
                        <td className="px-3 py-1 text-[#3a4250] select-none">{d.lineNum}</td>
                        <td className="px-1 py-1 text-center">
                          {d.status === 'match' && <span className="text-[#4ade80]">{'\u2713'}</span>}
                          {d.status === 'mismatch' && <span className="text-[#f87171]">{'\u2260'}</span>}
                          {d.status === 'missing_actual' && <span className="text-[#fbbf24]">{'\u2212'}</span>}
                          {d.status === 'missing_expected' && <span className="text-[#fbbf24]">{'\u002B'}</span>}
                        </td>
                        <td className={`px-3 py-1 whitespace-pre ${
                          isMismatch ? 'text-[#f87171]/80' : 'text-[#9fb0c6]'
                        }`}>
                          {d.expected || <span className="text-[#3a4456] italic">{'(empty)'}</span>}
                        </td>
                        <td className={`px-3 py-1 whitespace-pre ${
                          isMismatch ? 'text-[#f87171]' : 'text-[#9fb0c6]'
                        }`}>
                          {d.actual || <span className="text-[#3a4456] italic">{'(empty)'}</span>}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Bottom action */}
          {comparisonResult.mismatchCount === 0 && (
            <div className="px-4 py-3 border-t border-[#1e2736] flex items-center justify-between">
              <p className="text-[11px] text-[#4ade80]" style={sans}>
                All {comparisonResult.totalLines.toLocaleString()} lines match. Output parity confirmed.
              </p>
              <button
                onClick={onProceedToPerformance}
                className="px-4 py-1.5 text-[11px] font-semibold rounded-lg bg-[#45c4b0] text-[#0a0e14] hover:bg-[#3db3a0] transition-colors"
                style={mono}
              >
                Proceed to Performance {'\u2192'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Parity File Panel ---------- */

function ParityFilePanel({
  label,
  sublabel,
  value,
  onChange,
  onFileRead,
  disabled,
  color,
}: {
  label: string;
  sublabel: string;
  value: string;
  onChange: (v: string) => void;
  onFileRead: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
  color: string;
}) {
  const lineCount = value ? value.split('\n').length : 0;
  const inputId = `parity-file-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="bg-[#0c1018] border border-[#1e2736] rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e2736]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-[#e6edf7] block" style={mono}>{label}</span>
            <span className="text-[9px] text-[#5b6577] block" style={mono}>{sublabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lineCount > 0 && (
            <span className="text-[9px] text-[#5b6577]" style={mono}>
              {lineCount} lines
            </span>
          )}
          <label
            htmlFor={inputId}
            className="text-[9px] text-[#60a5fa] hover:text-[#93bbfc] cursor-pointer transition-colors"
            style={mono}
          >
            Upload
          </label>
          <input
            id={inputId}
            type="file"
            accept=".txt,.dat,.csv,.out,.log,.lst,*"
            onChange={onFileRead}
            className="hidden"
          />
        </div>
      </div>
      {/* Textarea */}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder={`Paste ${label.toLowerCase()} or upload a file...`}
        className="flex-1 min-h-[180px] p-3 text-[11px] text-[#9fb0c6] bg-[#0a0e14] resize-none focus:outline-none disabled:opacity-50 placeholder-[#3a4456]"
        style={mono}
        spellCheck={false}
        wrap="off"
      />
    </div>
  );
}

/* ---------- Performance Stage ---------- */

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 bg-[#111823] rounded-full h-2 border border-[#1e2736] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] font-semibold w-8 text-right" style={{ ...mono, color }}>
        {score}
      </span>
    </div>
  );
}

function PerformanceStage({
  perfData,
  perfLoading,
  perfError,
  langLabel,
  onRunLLMAnalysis,
  programName,
  benchInput,
  onBenchInputChange,
  benchLoading,
  benchResult,
  benchError,
  onRunBenchmark,
}: {
  perfData: PerfData | null;
  perfLoading: boolean;
  perfError: string | null;
  langLabel: string;
  onRunLLMAnalysis: () => void;
  programName: string;
  benchInput: string;
  onBenchInputChange: (v: string) => void;
  benchLoading: boolean;
  benchResult: BenchmarkResult | null;
  benchError: string | null;
  onRunBenchmark: () => void;
}) {
  const verdictConfig = perfData ? {
    faster: { label: `${langLabel} is faster overall`, bg: 'bg-[#4ade80]/10', border: 'border-[#4ade80]/30', text: 'text-[#4ade80]' },
    comparable: { label: 'Roughly comparable', bg: 'bg-[#fbbf24]/10', border: 'border-[#fbbf24]/30', text: 'text-[#fbbf24]' },
    slower: { label: 'COBOL is faster overall', bg: 'bg-[#f87171]/10', border: 'border-[#f87171]/30', text: 'text-[#f87171]' },
  } : null;
  const vc = perfData && verdictConfig ? verdictConfig[perfData.verdict] : null;

  const benchMaxTime = benchResult
    ? Math.max(...benchResult.cobol.runs, ...benchResult.modern.runs)
    : 0;

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-[14px] font-semibold text-[#e6edf7] mb-1" style={mono}>
        Performance Evaluation
      </h2>
      <p className="text-[11px] text-[#7a869a] mb-5" style={sans}>
        Compare COBOL and {langLabel} performance with execution benchmarks and LLM static analysis.
        {programName && <> Evaluating: <span className="text-[#dbe4f0]" style={mono}>{programName}</span></>}
      </p>

      {/* ===== Execution Benchmark Section ===== */}
      <div className="bg-[#0c1018] border border-[#1e2736] rounded-xl p-5 mb-6">
        <h3 className="text-[12px] font-semibold text-[#e6edf7] mb-1" style={mono}>
          Execution Benchmark
        </h3>
        <p className="text-[10px] text-[#5b6577] mb-4" style={sans}>
          Compile and run both COBOL and {langLabel} programs multiple times to compare wall-clock execution time.
        </p>

        <div className="flex items-start gap-4 mb-4">
          <div className="flex-1">
            <label className="text-[10px] text-[#7a869a] mb-1 block" style={mono}>Test Input (stdin)</label>
            <textarea
              value={benchInput}
              onChange={e => onBenchInputChange(e.target.value)}
              placeholder="Paste test input data here..."
              className="w-full min-h-[80px] p-2 text-[11px] text-[#9fb0c6] bg-[#0a0e14] border border-[#1e2736] rounded-lg resize-none focus:outline-none focus:border-[#45c4b0]/40 placeholder-[#3a4456]"
              style={mono}
              spellCheck={false}
              wrap="off"
            />
          </div>
          <div className="pt-5">
            <button
              onClick={onRunBenchmark}
              disabled={benchLoading}
              className="px-5 py-2 text-[11px] font-semibold rounded-lg bg-[#45c4b0] text-[#0a0e14] hover:bg-[#3db3a0] transition-colors disabled:opacity-40 flex items-center gap-2"
              style={mono}
            >
              {benchLoading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-[#0a0e14] border-t-transparent rounded-full animate-spin" />
                  Running...
                </>
              ) : (
                'Run Benchmark'
              )}
            </button>
          </div>
        </div>

        {/* Bench error */}
        {benchError && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-[#f87171]/10 border border-[#f87171]/30">
            <p className="text-[10px] text-[#f87171]" style={mono}>{benchError}</p>
          </div>
        )}

        {/* Bench results */}
        {benchResult && (
          <div>
            {/* Summary stats row */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-[#111823] rounded-lg p-3 border border-[#1e2736] text-center">
                <div className="text-[18px] font-bold text-[#f97316]" style={mono}>
                  {benchResult.cobol.mean_ms.toFixed(1)}ms
                </div>
                <div className="text-[9px] text-[#7a869a] mt-1" style={mono}>COBOL avg</div>
              </div>
              <div className="bg-[#111823] rounded-lg p-3 border border-[#1e2736] text-center">
                <div className="text-[18px] font-bold text-[#45c4b0]" style={mono}>
                  {benchResult.modern.mean_ms.toFixed(1)}ms
                </div>
                <div className="text-[9px] text-[#7a869a] mt-1" style={mono}>{langLabel} avg</div>
              </div>
              <div className="bg-[#111823] rounded-lg p-3 border border-[#1e2736] text-center">
                <div className={`text-[18px] font-bold ${benchResult.speedup > 1 ? 'text-[#4ade80]' : benchResult.speedup < 1 ? 'text-[#f87171]' : 'text-[#fbbf24]'}`} style={mono}>
                  {benchResult.speedup.toFixed(2)}x
                </div>
                <div className="text-[9px] text-[#7a869a] mt-1" style={mono}>Speedup</div>
              </div>
            </div>

            {/* Output match indicator */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[12px] ${benchResult.outputs_match ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                {benchResult.outputs_match ? '\u2713' : '\u2717'}
              </span>
              <span className="text-[10px] text-[#9fb0c6]" style={mono}>
                {benchResult.outputs_match ? 'Outputs match' : 'Outputs differ'}
              </span>
              <span className="text-[10px] text-[#5b6577] ml-2" style={mono}>
                COBOL: {benchResult.cobol.min_ms.toFixed(1)}&ndash;{benchResult.cobol.max_ms.toFixed(1)}ms
                {' | '}
                {langLabel}: {benchResult.modern.min_ms.toFixed(1)}&ndash;{benchResult.modern.max_ms.toFixed(1)}ms
              </span>
            </div>

            {/* Bar chart: per-run timings */}
            <div className="bg-[#111823] rounded-lg p-4 border border-[#1e2736]">
              <div className="text-[10px] text-[#5b6577] mb-3" style={mono}>Per-run timings</div>
              <div className="space-y-2">
                {benchResult.cobol.runs.map((t, i) => (
                  <div key={`run-${i}`} className="flex items-center gap-2">
                    <span className="text-[9px] text-[#5b6577] w-10 shrink-0 text-right" style={mono}>Run {i + 1}</span>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 flex items-center gap-1">
                        <div
                          className="h-3 rounded-sm bg-[#f97316]/70"
                          style={{ width: `${benchMaxTime > 0 ? (t / benchMaxTime) * 100 : 0}%`, minWidth: '2px' }}
                          title={`COBOL: ${t.toFixed(1)}ms`}
                        />
                        <span className="text-[8px] text-[#f97316] shrink-0" style={mono}>{t.toFixed(1)}</span>
                      </div>
                      <div className="flex-1 flex items-center gap-1">
                        <div
                          className="h-3 rounded-sm bg-[#45c4b0]/70"
                          style={{ width: `${benchMaxTime > 0 ? (benchResult.modern.runs[i] / benchMaxTime) * 100 : 0}%`, minWidth: '2px' }}
                          title={`${langLabel}: ${benchResult.modern.runs[i].toFixed(1)}ms`}
                        />
                        <span className="text-[8px] text-[#45c4b0] shrink-0" style={mono}>{benchResult.modern.runs[i].toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 pt-2 border-t border-[#1e2736]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#f97316]/70" />
                  <span className="text-[9px] text-[#7a869a]" style={mono}>COBOL (ms)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#45c4b0]/70" />
                  <span className="text-[9px] text-[#7a869a]" style={mono}>{langLabel} (ms)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== LLM Static Analysis Section ===== */}
      <div className="mb-6">
        <h3 className="text-[12px] font-semibold text-[#e6edf7] mb-1" style={mono}>
          LLM Static Analysis
        </h3>
        <p className="text-[10px] text-[#5b6577] mb-4" style={sans}>
          AI-powered analysis of code structure, patterns, and performance characteristics.
        </p>
      </div>

      {/* LLM loading spinner */}
      {perfLoading && (
        <div className="text-center mb-6">
          <div className="inline-block w-6 h-6 border-2 border-[#45c4b0] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-[11px] text-[#7a869a]" style={sans}>
            Sending COBOL and {langLabel} code to LLM for static performance evaluation...
          </p>
        </div>
      )}

      {/* LLM not yet run */}
      {!perfData && !perfError && !perfLoading && (
        <div className="text-center mb-6">
          <button
            onClick={onRunLLMAnalysis}
            className="px-5 py-2 text-[12px] font-semibold rounded-lg bg-[#45c4b0] text-[#0a0e14] hover:bg-[#3db3a0] transition-colors"
            style={mono}
          >
            Run LLM Analysis
          </button>
        </div>
      )}

      {/* LLM error (no data) */}
      {perfError && !perfData && (
        <div className="mb-6">
          <div className="mb-4 px-4 py-3 rounded-lg bg-[#f87171]/10 border border-[#f87171]/30">
            <p className="text-[11px] text-[#f87171]" style={mono}>
              LLM analysis failed: {perfError}
            </p>
          </div>
          <div className="text-center">
            <button
              onClick={onRunLLMAnalysis}
              className="px-5 py-2 text-[12px] font-semibold rounded-lg bg-[#45c4b0] text-[#0a0e14] hover:bg-[#3db3a0] transition-colors"
              style={mono}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* LLM results */}
      {perfData && vc && (
        <>
          {/* Error banner with cached data */}
          {perfError && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-[#f87171]/10 border border-[#f87171]/30">
              <p className="text-[11px] text-[#f87171]" style={mono}>
                LLM analysis failed: {perfError}. Showing cached data.
              </p>
              <button
                onClick={onRunLLMAnalysis}
                className="mt-2 text-[11px] text-[#f87171] underline hover:text-[#fca5a5] transition-colors"
                style={mono}
              >
                Retry
              </button>
            </div>
          )}

          {/* Summary card */}
          <div className="bg-[#0c1018] border border-[#1e2736] rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${vc.bg} ${vc.border} ${vc.text}`} style={mono}>
                  {vc.label}
                </span>
              </div>
              <button
                onClick={onRunLLMAnalysis}
                className="px-4 py-1.5 text-[11px] font-semibold rounded-lg border border-[#45c4b0]/30 text-[#45c4b0] hover:bg-[#45c4b0]/10 transition-colors"
                style={mono}
              >
                Re-run LLM Analysis
              </button>
            </div>

            {/* Overall scores side-by-side */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-[#111823] rounded-lg p-4 border border-[#1e2736] text-center">
                <div className="text-[24px] font-bold text-[#f97316]" style={mono}>
                  {perfData.overall_cobol_score}
                </div>
                <div className="text-[10px] text-[#7a869a] mt-1 flex items-center justify-center gap-1.5" style={mono}>
                  <span className="w-2 h-2 rounded-full bg-[#f97316]" />
                  COBOL Overall
                </div>
              </div>
              <div className="bg-[#111823] rounded-lg p-4 border border-[#1e2736] text-center">
                <div className="text-[24px] font-bold text-[#45c4b0]" style={mono}>
                  {perfData.overall_modern_score}
                </div>
                <div className="text-[10px] text-[#7a869a] mt-1 flex items-center justify-center gap-1.5" style={mono}>
                  <span className="w-2 h-2 rounded-full bg-[#45c4b0]" />
                  {langLabel} Overall
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#9fb0c6] leading-relaxed" style={sans}>
              {perfData.summary}
            </p>
          </div>

          {/* Category cards */}
          <div className="grid grid-cols-2 gap-4">
            {perfData.categories.map((cat) => (
              <div
                key={cat.name}
                className="bg-[#0c1018] border border-[#1e2736] rounded-xl p-4"
              >
                <h3 className="text-[12px] font-semibold text-[#e6edf7] mb-3" style={mono}>
                  {cat.name}
                </h3>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#f97316] w-14 shrink-0" style={mono}>COBOL</span>
                    <ScoreBar score={cat.cobol_score} color="#f97316" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#45c4b0] w-14 shrink-0" style={mono}>{langLabel}</span>
                    <ScoreBar score={cat.modern_score} color="#45c4b0" />
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <p className="text-[10px] text-[#7a869a] leading-relaxed" style={sans}>
                    <span className="text-[#f97316] font-semibold" style={mono}>COBOL: </span>
                    {cat.cobol_notes}
                  </p>
                  <p className="text-[10px] text-[#7a869a] leading-relaxed" style={sans}>
                    <span className="text-[#45c4b0] font-semibold" style={mono}>{langLabel}: </span>
                    {cat.modern_notes}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#1e2736]">
                  <p className="text-[10px] text-[#60a5fa] leading-relaxed" style={sans}>
                    <span className="font-semibold" style={mono}>Rec: </span>
                    {cat.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
