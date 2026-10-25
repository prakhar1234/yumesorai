'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { BrdModal, BrdData } from './BrdModal';
import { BrdCrossRefPanel } from './BrdCrossRefPanel';

// ---------------------------------------------------------------------------
// Types (shared by ReviewCard and ReviewWorkspace)
// ---------------------------------------------------------------------------
interface ReviewEntry {
  id: number;
  snippet: string;
  filePath: string;
  summary: string;
  timestamp: Date;
  startLine: number;
  endLine: number;
}

// ---------------------------------------------------------------------------
// Parse summary text for line references and render as clickable chips
// Matches patterns like: PARAGRAPH-NAME:123-456, lines 10-20, line 42
// ---------------------------------------------------------------------------
function renderSummaryWithRefs(
  text: string,
  onNavigate: ((start: number, end: number) => void) | undefined,
): JSX.Element {
  if (!onNavigate) return <>{text}</>;

  // Match: WORD:digits-digits, WORD:digits, lines digits-digits, line digits
  // Also handles en-dash (–) and parenthesized forms like (lines 42-43)
  const refPattern = /([A-Z][A-Z0-9_-]{2,}):(\d+)(?:\s*[-–]\s*(\d+))?|(?:lines?\s+)(\d+)(?:\s*[-–]\s*(\d+))?/gi;

  const parts: JSX.Element[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = refPattern.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push(<span key={`t${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
    }

    let startLine: number;
    let endLine: number;
    let label: string;

    if (match[1]) {
      // PARAGRAPH:start-end format
      startLine = parseInt(match[2], 10);
      endLine = match[3] ? parseInt(match[3], 10) : startLine;
      label = `${match[1]}:${match[2]}${match[3] ? `-${match[3]}` : ''}`;
    } else {
      // "lines X-Y" or "line X" format
      startLine = parseInt(match[4], 10);
      endLine = match[5] ? parseInt(match[5], 10) : startLine;
      label = match[0];
    }

    parts.push(
      <button
        key={`r${match.index}`}
        onClick={() => onNavigate(startLine, endLine)}
        className="inline-flex items-center text-[10px] rounded px-1 py-0.5 mx-0.5 transition-colors"
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          color: '#d29922',
          backgroundColor: '#d2992215',
          border: '1px solid #d2992230',
        }}
        title={`Jump to line${endLine !== startLine ? 's' : ''} ${startLine}${endLine !== startLine ? `-${endLine}` : ''}`}
      >
        {label}
      </button>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={`t${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

// ---------------------------------------------------------------------------
// Review Card (expandable + downloadable)
// ---------------------------------------------------------------------------
function ReviewCard({ review, onDismiss, onHighlightLines, onRegenerate }: {
  review: ReviewEntry;
  onDismiss?: (id: number) => void;
  onHighlightLines?: (startLine: number, endLine: number) => void;
  onRegenerate?: (review: ReviewEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleDownload = useCallback(() => {
    const text = [
      `Business Review`,
      `File: ${review.filePath}`,
      `Date: ${review.timestamp.toLocaleString()}`,
      ``,
      `--- Selected Code ---`,
      review.snippet,
      ``,
      `--- Business Logic ---`,
      review.summary,
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `review_${review.filePath.split('/').pop()?.replace(/\./g, '_') || 'snippet'}_${review.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [review]);

  return (
    <div className="px-3 py-3 border-b border-[#1e2736]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-[#5b6577] hover:text-[#9fb0c6] transition-colors"
        >
          {expanded ? '▾' : '▸'}
        </button>
        <span className="text-[10px] text-[#5b6577] truncate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {review.filePath.split('/').pop()}
        </span>
        {review.startLine > 0 && onHighlightLines && (
          <button
            onClick={() => onHighlightLines(review.startLine, review.endLine)}
            className="text-[9px] text-[#d29922] hover:text-[#e6b84d] bg-[#d2992215] px-1.5 py-0.5 rounded transition-colors"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            title="Jump to lines"
          >
            L{review.startLine}{review.endLine !== review.startLine ? `-${review.endLine}` : ''}
          </button>
        )}
        <span className="text-[9px] text-[#3a4250]">
          {review.timestamp.toLocaleTimeString()}
        </span>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {onRegenerate && (
            <button
              onClick={() => onRegenerate(review)}
              className="text-[9px] text-[#5b6577] hover:text-[#45c4b0] transition-colors px-1"
              title="Regenerate review"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 8a6 6 0 0 1 10.3-4.2M14 2v4h-4M14 8a6 6 0 0 1-10.3 4.2M2 14v-4h4" />
              </svg>
            </button>
          )}
          <button
            onClick={handleDownload}
            className="text-[9px] text-[#5b6577] hover:text-[#9fb0c6] transition-colors px-1"
            title="Download review"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10" />
            </svg>
          </button>
          {onDismiss && (
            <button
              onClick={() => onDismiss(review.id)}
              className="text-[#5b6577] hover:text-[#e6edf7] transition-colors text-[14px] leading-none px-0.5"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Snippet */}
      <div className="bg-[#111823] border border-[#232c3c] rounded-md p-2 mb-2">
        <pre
          className={`text-[10px] text-[#7a869a] whitespace-pre-wrap break-all ${expanded ? 'max-h-none' : 'max-h-12 overflow-hidden'}`}
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {expanded ? review.snippet : review.snippet.slice(0, 150)}{!expanded && review.snippet.length > 150 ? '...' : ''}
        </pre>
      </div>

      {/* Summary */}
      <div className="bg-[#0a0e14] border border-[#1e2736] rounded-md p-2.5">
        <span
          className="text-[10px] text-[#45c4b0] uppercase tracking-wider block mb-1.5"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Business Logic
        </span>
        <div className={`text-[11px] text-[#dbe4f0] leading-relaxed whitespace-pre-wrap ${expanded ? '' : 'line-clamp-4'}`}>
          {renderSummaryWithRefs(review.summary, onHighlightLines)}
        </div>
      </div>

      {/* Expand toggle */}
      {(!expanded && (review.snippet.length > 150 || review.summary.length > 200)) && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-1.5 text-[9px] text-[#5b6577] hover:text-[#9fb0c6] transition-colors"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Show more
        </button>
      )}
      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-1.5 text-[9px] text-[#5b6577] hover:text-[#9fb0c6] transition-colors"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Show less
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface FileEntry {
  name: string;
  path: string;
  loc: number;
  type: 'cbl' | 'cpy' | 'jcl' | 'bms';
}

interface FolderEntry {
  name: string;
  children: FileEntry[];
}

interface SourceFile {
  path: string;
  name: string;
  ext: string;
  type: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Build file tree from source files
// ---------------------------------------------------------------------------
function buildFileTree(sources: SourceFile[]): FolderEntry[] {
  const folders = new Map<string, FileEntry[]>();

  for (const src of sources) {
    const lastSlash = src.path.lastIndexOf('/');
    const dir = lastSlash >= 0 ? src.path.substring(0, lastSlash) : '.';

    if (!folders.has(dir)) {
      folders.set(dir, []);
    }

    const ext = src.ext.toLowerCase();
    const fileType: FileEntry['type'] = ext === '.cpy' ? 'cpy'
      : ext === '.jcl' ? 'jcl'
      : ext === '.bms' ? 'bms'
      : 'cbl';

    folders.get(dir)!.push({
      name: src.path.split('/').pop() || src.name,
      path: src.path,
      loc: src.content.split('\n').length,
      type: fileType,
    });
  }

  return Array.from(folders.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, children]) => ({
      name,
      children: children.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

// ---------------------------------------------------------------------------
// Syntax highlighting
// ---------------------------------------------------------------------------
function highlightCobolLine(line: string): JSX.Element {
  const trimmed = line.trimStart();

  if (line.length >= 7 && line[6] === '*') {
    return <span style={{ color: '#57634f' }}>{line}</span>;
  }
  if (trimmed.startsWith('//')) {
    return <span style={{ color: '#c9a56a' }}>{line}</span>;
  }
  if (trimmed.includes('EXEC SQL') || trimmed.includes('END-EXEC') ||
      trimmed.includes('INSERT INTO') || trimmed.includes('UPDATE ') ||
      trimmed.includes('SELECT ') || trimmed.includes('DELETE ') ||
      trimmed.includes('VALUES') || trimmed.includes('WHERE ') ||
      trimmed.includes('SET ') || trimmed.includes('INTO :') ||
      trimmed.includes('FROM ')) {
    return <span style={{ color: '#58b0ff' }}>{line}</span>;
  }
  if (trimmed.includes('ANBX') || trimmed.includes("CALL 'ANBX")) {
    return <span style={{ color: '#d29922' }}>{line}</span>;
  }
  if (trimmed.includes('DIVISION') || trimmed.includes('SECTION') ||
      trimmed.startsWith('COPY ') || trimmed.includes('PROGRAM-ID') ||
      trimmed.includes('EXEC CICS')) {
    return <span style={{ color: '#7de0cf' }}>{line}</span>;
  }
  return <span style={{ color: '#9fb0c6' }}>{line}</span>;
}

interface ReviewWorkspaceProps {
  repoUrl: string;
  initialSources: SourceFile[];
  initialCached: boolean;
  commitSha: string;
  commitDate: string;
  branch: string;
  onDisconnect: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ReviewWorkspace({ repoUrl, initialSources, initialCached, commitSha, commitDate, branch, onDisconnect }: ReviewWorkspaceProps) {
  // Derived data from pre-fetched sources
  const fileTree = useMemo(() => buildFileTree(initialSources), [initialSources]);
  const initialFileContents = useMemo(() => {
    const map: Record<string, string> = {};
    for (const src of initialSources) {
      map[src.path] = src.content;
    }
    return map;
  }, [initialSources]);
  const [fileContents, setFileContents] = useState<Record<string, string>>(initialFileContents);

  // Default to first file
  const firstFile = fileTree[0]?.children[0]?.path || '';
  const [selectedFile, setSelectedFile] = useState<string>(firstFile);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(fileTree.map(f => f.name))
  );
  const [selectedText, setSelectedText] = useState('');
  const [selectedLineRange, setSelectedLineRange] = useState<{ start: number; end: number } | null>(null);
  const [reviewButtonPos, setReviewButtonPos] = useState<{ top: number; left: number } | null>(null);
  const [reviews, setReviews] = useState<ReviewEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLPreElement>(null);
  const nextId = useRef(1);

  // BRD state
  const [brdModalOpen, setBrdModalOpen] = useState(false);
  const [brdLoading, setBrdLoading] = useState(false);
  const [brdLoadingStage, setBrdLoadingStage] = useState('');
  const [brdLoadingDetail, setBrdLoadingDetail] = useState('');
  const [brdError, setBrdError] = useState<string | null>(null);
  const [brdData, setBrdData] = useState<BrdData | null>(null);
  const [brdFilePath, setBrdFilePath] = useState('');
  const [brdCached, setBrdCached] = useState(false);

  const [brdGeneratedAt, setBrdGeneratedAt] = useState<string>('');

  // Freshness check state
  const [brdUpdateAvailable, setBrdUpdateAvailable] = useState(false);
  const [brdLatestCommitInfo, setBrdLatestCommitInfo] = useState<{ sha: string; date: string; message: string } | null>(null);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveConfirmation, setSaveConfirmation] = useState(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cross-reference state
  const [rightPanelMode, setRightPanelMode] = useState<'reviews' | 'brd'>('reviews');
  const [highlightedLines, setHighlightedLines] = useState<{ start: number; end: number } | null>(null);
  const [activeLineRange, setActiveLineRange] = useState<string | null>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const brdNavSwitchRef = useRef(false);

  const toggleFolder = useCallback((name: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // Handle text selection in the code viewer
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectedText('');
      setSelectedLineRange(null);
      setReviewButtonPos(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 5) {
      setSelectedText('');
      setSelectedLineRange(null);
      setReviewButtonPos(null);
      return;
    }

    setSelectedText(text);

    // Extract actual line numbers from the DOM using data-line attributes
    const range = selection.getRangeAt(0);
    const findLineNum = (node: Node | null): number | null => {
      let el = node instanceof HTMLElement ? node : node?.parentElement;
      while (el) {
        const attr = el.getAttribute('data-line');
        if (attr) return parseInt(attr, 10);
        el = el.parentElement;
      }
      return null;
    };
    const anchorLine = findLineNum(selection.anchorNode);
    const focusLine = findLineNum(selection.focusNode);
    if (anchorLine && focusLine) {
      const start = Math.min(anchorLine, focusLine);
      const end = Math.max(anchorLine, focusLine);
      setSelectedLineRange({ start, end });
    } else {
      setSelectedLineRange(null);
    }

    // Position the floating button near the end of the selection.
    const rect = range.getBoundingClientRect();
    const container = codeRef.current?.parentElement;
    const containerRect = container?.getBoundingClientRect();
    if (containerRect && container) {
      setReviewButtonPos({
        top: rect.bottom - containerRect.top + container.scrollTop + 4,
        left: rect.right - containerRect.left - 40,
      });
    }
  }, []);

  // Clear selection when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-review-button]')) return;
      // Don't clear if selecting text
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;
      setReviewButtonPos(null);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Ctrl+F / Cmd+F to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
        setSearchMatchIndex(0);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  // Navigate to lines from a BRD cross-reference chip
  const handleNavigateToLines = useCallback((linesStr: string) => {
    const match = linesStr.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) return;
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : start;

    // Switch to the BRD's file if viewing a different one
    if (brdFilePath && selectedFile !== brdFilePath) {
      brdNavSwitchRef.current = true;
      setSelectedFile(brdFilePath);
    }

    setHighlightedLines({ start, end });
    setActiveLineRange(linesStr);

    // Scroll to the start line (use double-rAF to allow file switch render)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = lineRefs.current.get(start);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    // Auto-clear after 8 seconds
    const timerId = setTimeout(() => {
      setHighlightedLines(prev => {
        // Only clear if it's still the same highlight
        if (prev && prev.start === start && prev.end === end) {
          setActiveLineRange(null);
          return null;
        }
        return prev;
      });
    }, 8000);

    return () => clearTimeout(timerId);
  }, [brdFilePath, selectedFile]);

  // Clear highlights and exit edit mode when selected file changes
  // (skip clear if the switch was triggered by a BRD line-reference click)
  useEffect(() => {
    if (brdNavSwitchRef.current) {
      brdNavSwitchRef.current = false;
      setEditMode(false);
      return;
    }
    setHighlightedLines(null);
    setActiveLineRange(null);
    setEditMode(false);
  }, [selectedFile]);

  // Overlay review cards (stacked on the editor)
  const [overlayReviews, setOverlayReviews] = useState<ReviewEntry[]>([]);

  const dismissOverlayReview = useCallback((id: number) => {
    setOverlayReviews(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleReview = useCallback(async () => {
    if (!selectedText) return;

    setLoading(true);
    setError(null);
    setReviewButtonPos(null);

    const snippet = selectedText;

    // Use the DOM-derived line range (accurate), fall back to counting snippet lines
    const startLine = selectedLineRange?.start ?? 1;
    const endLine = selectedLineRange?.end ?? (startLine + snippet.split('\n').length - 1);

    // Highlight the selected lines immediately
    setHighlightedLines({ start: startLine, end: endLine });

    try {
      const resp = await fetch('/api/demystifier/business-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snippet,
          file_path: selectedFile,
          repo_url: repoUrl,
          start_line: startLine,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();

      const entry: ReviewEntry = {
        id: nextId.current++,
        snippet,
        filePath: selectedFile,
        summary: data.summary || 'No summary returned.',
        timestamp: new Date(),
        startLine,
        endLine,
      };

      // Add to both the overlay stack and the side panel history
      setOverlayReviews(prev => [entry, ...prev]);
      setReviews(prev => [entry, ...prev]);

      setSelectedText('');
      setSelectedLineRange(null);
      window.getSelection()?.removeAllRanges();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [selectedText, selectedFile, repoUrl, selectedLineRange]);

  const handleRegenerate = useCallback(async (oldReview: ReviewEntry) => {
    setLoading(true);
    setError(null);

    setHighlightedLines({ start: oldReview.startLine, end: oldReview.endLine });

    try {
      const resp = await fetch('/api/demystifier/business-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snippet: oldReview.snippet,
          file_path: oldReview.filePath,
          repo_url: repoUrl,
          start_line: oldReview.startLine,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();

      const updated: ReviewEntry = {
        ...oldReview,
        summary: data.summary || 'No summary returned.',
        timestamp: new Date(),
      };

      setReviews(prev => prev.map(r => r.id === oldReview.id ? updated : r));
      setOverlayReviews(prev => prev.map(r => r.id === oldReview.id ? updated : r));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [repoUrl]);

  const handleGenerateBrd = useCallback(async (filePath: string) => {
    // Toggle off if already open for the same file
    if (rightPanelMode === 'brd' && brdFilePath === filePath) {
      setRightPanelMode('reviews');
      setHighlightedLines(null);
      setActiveLineRange(null);
      return;
    }

    const programContent = fileContents[filePath];
    if (!programContent) return;

    // Switch to BRD panel and ensure the file is selected
    setSelectedFile(filePath);
    setBrdFilePath(filePath);
    setBrdData(null);
    setBrdError(null);
    setBrdCached(false);
    setBrdLoading(true);
    setBrdLoadingStage('Checking for cached BRD...');
    setBrdLoadingDetail('');
    setRightPanelMode('brd');
    setHighlightedLines(null);
    setActiveLineRange(null);

    try {
      // Pre-check: does a cached BRD exist for this file?
      let hasCachedBrd = false;
      let cachedGeneratedAt = '';
      try {
        const checkResp = await fetch('/api/demystifier/program-brd/check-freshness', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_url: repoUrl, branch, file_path: filePath }),
        });
        if (checkResp.ok) {
          const checkData = await checkResp.json();
          hasCachedBrd = checkData.has_cached_brd === true;
          cachedGeneratedAt = checkData.cached_generated_at || '';
        }
      } catch {
        // Pre-check failure is non-fatal
      }

      if (hasCachedBrd) {
        const genDate = cachedGeneratedAt
          ? new Date(cachedGeneratedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            + ', ' + new Date(cachedGeneratedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
          : '';
        setBrdLoadingStage('Cache found — loading BRD...');
        setBrdLoadingDetail(
          (genDate ? `Generated ${genDate}` : 'Cached BRD available') + ' · ~1-2s'
        );
      } else {
        setBrdLoadingStage('No cached BRD — generating via AI...');
        setBrdLoadingDetail('Full program analysis with LLM · ~30-90s');
      }

      const resp = await fetch('/api/demystifier/program-brd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_content: programContent,
          file_path: filePath,
          repo_url: repoUrl,
          commit_sha: commitSha,
          branch,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'BRD generation failed' }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      if (data.brd) {
        setBrdData(data.brd);
        setBrdCached(data.cached ?? false);
        setBrdGeneratedAt(data.generated_at ?? '');
        setBrdUpdateAvailable(false);
        setBrdLatestCommitInfo(null);

        // Auto-check freshness when serving from cache
        if (data.cached) {
          fetch('/api/demystifier/program-brd/check-freshness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repo_url: repoUrl, branch, file_path: filePath }),
          })
            .then(r => r.ok ? r.json() : null)
            .then(freshness => {
              if (freshness && freshness.updates_available) {
                setBrdUpdateAvailable(true);
                setBrdLatestCommitInfo({
                  sha: freshness.latest_commit_sha,
                  date: freshness.latest_commit_date,
                  message: freshness.latest_commit_message,
                });
              }
            })
            .catch(() => { /* freshness check is best-effort */ });
        }
      } else {
        setBrdError('No BRD data returned from API');
      }
    } catch (e) {
      setBrdError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBrdLoading(false);
    }
  }, [repoUrl, commitSha, branch, rightPanelMode, brdFilePath, fileContents]);

  // Close BRD panel and return to reviews
  const handleCloseBrdPanel = useCallback(() => {
    setRightPanelMode('reviews');
    setHighlightedLines(null);
    setActiveLineRange(null);
  }, []);

  // Open full BRD modal from the cross-ref panel
  const handleOpenFullBrd = useCallback(() => {
    setBrdModalOpen(true);
  }, []);

  // Handle "Fetch & Regenerate" — re-triggers BRD generation which will miss cache
  const handleFetchAndRegenerate = useCallback(() => {
    setBrdUpdateAvailable(false);
    setBrdLatestCommitInfo(null);
    if (brdFilePath) {
      // Reset BRD state so it regenerates
      setBrdData(null);
      setBrdCached(false);
      setBrdGeneratedAt('');
      handleGenerateBrd(brdFilePath);
    }
  }, [brdFilePath, handleGenerateBrd]);

  // Handle saving edited code
  const handleSaveCode = useCallback(async () => {
    if (!selectedFile || !editedContent[selectedFile]) return;

    setSaving(true);
    try {
      const resp = await fetch('/api/demystifier/program-brd/save-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: repoUrl,
          branch,
          file_path: selectedFile,
          content: editedContent[selectedFile],
          commit_sha: commitSha,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      // Update local file contents with the edited version
      setFileContents(prev => ({ ...prev, [selectedFile]: editedContent[selectedFile] }));
      setEditMode(false);
      setSaveConfirmation(true);
      setTimeout(() => setSaveConfirmation(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [selectedFile, editedContent, repoUrl, branch, commitSha]);

  // Handle discarding edits
  const handleDiscardEdits = useCallback(() => {
    setEditedContent(prev => {
      const next = { ...prev };
      delete next[selectedFile];
      return next;
    });
    setEditMode(false);
  }, [selectedFile]);

  // Handle entering edit mode
  const handleEnterEditMode = useCallback(() => {
    if (!editedContent[selectedFile]) {
      setEditedContent(prev => ({ ...prev, [selectedFile]: fileContents[selectedFile] || '' }));
    }
    setEditMode(true);
  }, [selectedFile, editedContent, fileContents]);

  const hasUnsavedChanges = editMode && editedContent[selectedFile] !== fileContents[selectedFile];

  const content = fileContents[selectedFile] || '      * File content not available';
  const lines = content.split('\n');
  const fileEntry = fileTree.flatMap(f => f.children).find(f => f.path === selectedFile);

  // Compute search matches (line numbers that contain the query)
  const searchMatches = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    const matches: number[] = [];
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes(q)) matches.push(i + 1);
    });
    return matches;
  }, [searchQuery, lines]);

  // Scroll to the current match when it changes
  useEffect(() => {
    if (searchMatches.length > 0) {
      const lineNum = searchMatches[searchMatchIndex];
      const el = lineRefs.current.get(lineNum);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchMatchIndex, searchMatches]);

  // Extract PROGRAM-ID from COBOL source
  const programName = useMemo(() => {
    const match = content.match(/PROGRAM-ID\.\s+([A-Za-z0-9_-]+)/i);
    return match ? match[1] : null;
  }, [content]);

  // Empty state: no sources loaded
  if (initialSources.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[14px] text-[#7a869a] mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            No source files found
          </p>
          <p className="text-[12px] text-[#5b6577]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            The repository may not contain COBOL files, or they could not be fetched.
          </p>
          <button
            onClick={onDisconnect}
            className="mt-4 px-4 py-2 text-[12px] text-[#45c4b0] border border-[#45c4b0] rounded hover:bg-[#45c4b010] transition-colors"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Sidebar - File Tree */}
      <div className="w-[240px] border-r border-[#1e2736] bg-[#0c1018] flex flex-col">
        <div className="px-3 py-2.5 border-b border-[#1e2736]">
          <div className="flex items-center justify-between">
            <span
              className="text-[10.5px] text-[#5b6577] uppercase tracking-wider"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Repository
            </span>
            <button
              onClick={onDisconnect}
              className="text-[10px] text-[#5b6577] hover:text-[#9fb0c6] transition-colors"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Disconnect
            </button>
          </div>
          <p
            className="text-[11px] text-[#9fb0c6] mt-1 truncate"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {repoUrl.replace(/^https?:\/\//, '').replace(/^github\.com\//, '')}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span
              className={`inline-block text-[9px] px-1.5 py-0.5 rounded ${
                initialCached
                  ? 'text-[#45c4b0] bg-[#45c4b018]'
                  : 'text-[#58b0ff] bg-[#58b0ff18]'
              }`}
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {initialCached ? 'Cached' : 'Fresh'}
            </span>
            {commitDate && (
              <span
                className="text-[9px] text-[#5b6577]"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                title={`Last commit: ${new Date(commitDate).toLocaleString()}`}
              >
                {new Date(commitDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{', '}
                {new Date(commitDate).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {fileTree.map(folder => (
            <div key={folder.name}>
              <button
                onClick={() => toggleFolder(folder.name)}
                className="flex items-center gap-1.5 w-full px-3 py-1 text-left hover:bg-[#111823] transition-colors"
              >
                <span className="text-[10px] text-[#5b6577]">
                  {expandedFolders.has(folder.name) ? '▾' : '▸'}
                </span>
                <span
                  className="text-[11px] text-[#7a869a]"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {folder.name}/
                </span>
              </button>
              {expandedFolders.has(folder.name) && folder.children.map(file => (
                <div key={file.path} className="group flex items-center">
                  <button
                    onClick={() => setSelectedFile(file.path)}
                    className={`flex items-center justify-between flex-1 min-w-0 pl-7 pr-1 py-1 text-left transition-colors ${
                      selectedFile === file.path
                        ? 'bg-[#182233] text-[#e6edf7]'
                        : 'text-[#9fb0c6] hover:bg-[#111823]'
                    }`}
                  >
                    <span
                      className="text-[11px] truncate"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {file.name}
                    </span>
                    <span
                      className="text-[9px] text-[#5b6577] ml-2 shrink-0"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {file.loc.toLocaleString()}
                    </span>
                  </button>
                  {file.type === 'cbl' && (() => {
                    const isBrdActive = rightPanelMode === 'brd' && brdFilePath === file.path;
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateBrd(file.path);
                        }}
                        className={`text-[9px] px-1.5 pr-2 py-1 transition-all shrink-0 ${
                          isBrdActive
                            ? 'opacity-100 text-[#0a0e14] bg-[#45c4b0] rounded-sm'
                            : 'opacity-0 group-hover:opacity-100 text-[#45c4b0] hover:text-[#3aad9c]'
                        }`}
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        title={isBrdActive ? 'Close BRD panel' : 'Generate Business Requirements Document'}
                      >
                        BRD
                      </button>
                    );
                  })()}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Center - Code Viewer with text selection */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="flex items-center h-9 px-3 bg-[#0c1018] border-b border-[#1e2736]">
          <span
            className="text-[11px] text-[#9fb0c6]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {selectedFile}
          </span>
          {programName && (
            <span
              className="text-[10px] text-[#45c4b0] ml-3 px-1.5 py-0.5 bg-[#45c4b010] border border-[#45c4b025] rounded"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {programName}
            </span>
          )}
          {fileEntry && (
            <span
              className="text-[10px] text-[#5b6577] ml-2"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {fileEntry.loc.toLocaleString()} LOC
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {saveConfirmation && (
              <span className="text-[10px] text-[#45c4b0]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                Saved
              </span>
            )}
            {editMode ? (
              <>
                <button
                  onClick={handleSaveCode}
                  disabled={saving || !hasUnsavedChanges}
                  className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                    saving || !hasUnsavedChanges
                      ? 'text-[#5b6577] bg-[#1e2736] cursor-not-allowed'
                      : 'text-[#0a0e14] bg-[#45c4b0] hover:bg-[#3aad9c]'
                  }`}
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleDiscardEdits}
                  disabled={saving}
                  className="text-[10px] text-[#9fb0c6] hover:text-[#e6edf7] px-2 py-0.5 rounded transition-colors"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Discard
                </button>
              </>
            ) : (
              <>
                <span className="text-[10px] text-[#5b6577]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  Select code to review
                </span>
                {fileEntry?.type === 'cbl' && (
                  <button
                    onClick={() => handleGenerateBrd(selectedFile)}
                    disabled={brdLoading}
                    className={`text-[10px] px-2.5 py-0.5 rounded transition-colors ${
                      rightPanelMode === 'brd' && brdFilePath === selectedFile
                        ? 'text-[#0a0e14] bg-[#45c4b0] hover:bg-[#3aad9c]'
                        : 'text-[#45c4b0] border border-[#45c4b0] hover:bg-[#45c4b010]'
                    } ${brdLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    title={rightPanelMode === 'brd' && brdFilePath === selectedFile ? 'Close BRD panel' : 'Generate Business Requirements Document'}
                  >
                    {brdLoading && brdFilePath === selectedFile ? 'Generating...' : 'BRD'}
                  </button>
                )}
                <button
                  onClick={handleEnterEditMode}
                  className="text-[10px] text-[#7a869a] hover:text-[#e6edf7] px-2 py-0.5 border border-[#1e2736] rounded hover:border-[#3a4250] transition-colors"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Edit
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="flex items-center gap-2 h-8 px-3 bg-[#111823] border-b border-[#1e2736]">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#5b6577" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchMatchIndex(0); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchMatches.length > 0) {
                    setSearchMatchIndex(prev => (e.shiftKey ? (prev - 1 + searchMatches.length) % searchMatches.length : (prev + 1) % searchMatches.length));
                  }
                }
                if (e.key === 'Escape') {
                  setSearchOpen(false);
                  setSearchQuery('');
                  setSearchMatchIndex(0);
                }
              }}
              placeholder="Search in file..."
              className="flex-1 bg-transparent text-[11px] text-[#e6edf7] outline-none placeholder-[#3a4250]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              autoFocus
            />
            {searchQuery && (
              <span className="text-[10px] text-[#5b6577] shrink-0" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {searchMatches.length > 0
                  ? `${searchMatchIndex + 1} / ${searchMatches.length}`
                  : 'No results'}
              </span>
            )}
            {searchMatches.length > 1 && (
              <>
                <button
                  onClick={() => setSearchMatchIndex(prev => (prev - 1 + searchMatches.length) % searchMatches.length)}
                  className="text-[#5b6577] hover:text-[#e6edf7] transition-colors text-[14px] leading-none px-0.5"
                  title="Previous match (Shift+Enter)"
                >
                  &#x25B2;
                </button>
                <button
                  onClick={() => setSearchMatchIndex(prev => (prev + 1) % searchMatches.length)}
                  className="text-[#5b6577] hover:text-[#e6edf7] transition-colors text-[14px] leading-none px-0.5"
                  title="Next match (Enter)"
                >
                  &#x25BC;
                </button>
              </>
            )}
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchMatchIndex(0); }}
              className="text-[#5b6577] hover:text-[#e6edf7] transition-colors text-[14px] leading-none px-1"
            >
              &times;
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto bg-[#0a0e14] relative">
          {editMode ? (
            <textarea
              value={editedContent[selectedFile] ?? content}
              onChange={(e) => setEditedContent(prev => ({ ...prev, [selectedFile]: e.target.value }))}
              className="w-full h-full bg-[#0a0e14] text-[#9fb0c6] text-[12px] leading-[1.6] p-0 pl-14 resize-none outline-none border-none"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              spellCheck={false}
            />
          ) : (
            <>
              <pre
                ref={codeRef}
                className="text-[12px] leading-[1.6] relative"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                onMouseUp={handleMouseUp}
              >
                <code>
                  {lines.map((line, i) => {
                    const lineNum = i + 1;
                    const isHighlighted = highlightedLines
                      ? lineNum >= highlightedLines.start && lineNum <= highlightedLines.end
                      : false;
                    const isSearchMatch = searchQuery && searchMatches.includes(lineNum);
                    const isCurrentMatch = isSearchMatch && searchMatches[searchMatchIndex] === lineNum;
                    return (
                      <div
                        key={i}
                        data-line={lineNum}
                        ref={(el) => {
                          if (el) lineRefs.current.set(lineNum, el);
                          else lineRefs.current.delete(lineNum);
                        }}
                        className={`flex ${
                          isHighlighted
                            ? 'border-l-[3px] border-[#45c4b0]'
                            : isCurrentMatch
                              ? 'border-l-[3px] border-[#d29922]'
                              : 'hover:bg-[#111823]'
                        }`}
                        style={
                          isCurrentMatch
                            ? { backgroundColor: 'rgba(210, 153, 34, 0.2)' }
                            : isSearchMatch
                              ? { backgroundColor: 'rgba(210, 153, 34, 0.08)' }
                              : isHighlighted
                                ? { backgroundColor: 'rgba(69, 196, 176, 0.15)' }
                                : undefined
                        }
                      >
                        <span
                          className="inline-block w-12 text-right pr-4 select-none shrink-0"
                          style={{ color: isCurrentMatch ? '#d29922' : isHighlighted ? '#45c4b0' : '#3a4250' }}
                        >
                          {lineNum}
                        </span>
                        {highlightCobolLine(line)}
                      </div>
                    );
                  })}
                </code>
              </pre>

              {/* Floating Review button */}
              {reviewButtonPos && !loading && (
                <button
                  data-review-button
                  onClick={handleReview}
                  className="absolute z-30 px-3 py-1.5 bg-[#45c4b0] hover:bg-[#3aad9c] text-[#0a0e14] font-semibold text-[11px] rounded-md shadow-lg transition-colors"
                  style={{
                    top: reviewButtonPos.top,
                    left: Math.max(0, reviewButtonPos.left),
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  Review
                </button>
              )}
            </>
          )}
        </div>

        {/* Overlay review cards — stacked on the editor */}
        {(overlayReviews.length > 0 || loading) && (
          <div className="absolute bottom-10 right-4 z-40 flex flex-col-reverse gap-2 max-h-[60%] overflow-y-auto" style={{ width: 340 }}>
            {loading && (
              <div
                className="rounded-lg border border-[#232c3c] shadow-xl p-3"
                style={{ backgroundColor: '#111823', fontFamily: "'IBM Plex Mono', monospace" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 border-2 border-[#45c4b0] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] text-[#7a869a]">Analyzing...</span>
                </div>
                <pre className="text-[10px] text-[#5b6577] whitespace-pre-wrap break-all max-h-12 overflow-hidden">
                  {selectedText.slice(0, 150)}{selectedText.length > 150 ? '...' : ''}
                </pre>
              </div>
            )}
            {overlayReviews.map((review, i) => (
              <div
                key={review.id}
                className="rounded-lg border border-[#232c3c] shadow-xl"
                style={{
                  backgroundColor: '#111823',
                  fontFamily: "'IBM Plex Mono', monospace",
                  opacity: Math.max(0.5, 1 - i * 0.15),
                }}
              >
                <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[9px] text-[#5b6577] truncate">{review.filePath.split('/').pop()}</span>
                    <span className="text-[8px] text-[#3a4250]">{review.timestamp.toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleRegenerate(review)}
                      className="text-[#5b6577] hover:text-[#45c4b0] transition-colors px-1"
                      title="Regenerate review"
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 8a6 6 0 0 1 10.3-4.2M14 2v4h-4M14 8a6 6 0 0 1-10.3 4.2M2 14v-4h4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => dismissOverlayReview(review.id)}
                      className="text-[#5b6577] hover:text-[#e6edf7] transition-colors text-[14px] leading-none px-1"
                    >
                      &times;
                    </button>
                  </div>
                </div>
                <div className="px-3 pb-1">
                  <div className="bg-[#0a0e14] border border-[#1e2736] rounded p-1.5 mb-1.5">
                    <pre className="text-[9px] text-[#7a869a] whitespace-pre-wrap break-all max-h-10 overflow-hidden">
                      {review.snippet.slice(0, 120)}{review.snippet.length > 120 ? '...' : ''}
                    </pre>
                  </div>
                </div>
                <div className="px-3 pb-2.5">
                  <span className="text-[8px] text-[#45c4b0] uppercase tracking-wider block mb-1">Business Logic</span>
                  <div className="text-[10px] text-[#dbe4f0] leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto">
                    {renderSummaryWithRefs(review.summary, (start, end) => {
                      setHighlightedLines({ start, end });
                      requestAnimationFrame(() => {
                        const el = lineRefs.current.get(start);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      });
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom hint bar */}
        <div className="border-t border-[#1e2736] bg-[#0c1018] px-3 py-2">
          <p className="text-[10.5px] text-[#5b6577]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {saving
              ? 'Saving edited code...'
              : editMode
              ? hasUnsavedChanges
                ? 'You have unsaved changes — click Save or Discard'
                : 'Editing — make changes to the code above'
              : loading
              ? 'Analyzing selected code...'
              : 'Highlight any section of code, then click "Review" to get a business logic summary'}
          </p>
        </div>
      </div>

      {/* Right Panel — conditional: BRD cross-ref or Reviews */}
      {rightPanelMode === 'brd' ? (
        // BRD Cross-Reference Panel
        brdLoading ? (
          <div className="w-[360px] border-l border-[#1e2736] bg-[#0c1018] flex flex-col">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e2736]">
              <span
                className="text-[11px] font-semibold text-[#e6edf7]"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                BRD Cross-Reference
              </span>
              <button
                onClick={handleCloseBrdPanel}
                className="text-[#5b6577] hover:text-[#e6edf7] transition-colors text-[16px] leading-none px-1"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
              <div className="w-6 h-6 border-2 border-[#45c4b0] border-t-transparent rounded-full animate-spin" />
              <p className="text-[11px] text-[#9fb0c6] text-center" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {brdLoadingStage || 'Generating BRD...'}
              </p>
              {brdLoadingDetail && (
                <p className="text-[10px] text-[#5b6577] text-center" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {brdLoadingDetail}
                </p>
              )}
            </div>
          </div>
        ) : brdError ? (
          <div className="w-[360px] border-l border-[#1e2736] bg-[#0c1018] flex flex-col">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e2736]">
              <span
                className="text-[11px] font-semibold text-[#e6edf7]"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                BRD Cross-Reference
              </span>
              <button
                onClick={handleCloseBrdPanel}
                className="text-[#5b6577] hover:text-[#e6edf7] transition-colors text-[16px] leading-none px-1"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="bg-[#ef444420] border border-[#ef4444] rounded-lg p-4 max-w-sm">
                <p className="text-[11px] text-[#ef4444] font-semibold mb-1">BRD Generation Failed</p>
                <p className="text-[10px] text-[#ef9a9a] leading-relaxed">{brdError}</p>
              </div>
            </div>
          </div>
        ) : brdData ? (
          <div className="w-[360px] border-l border-[#1e2736] bg-[#0c1018] flex flex-col min-h-0 overflow-hidden">
            <div className={`px-3 py-1 border-b border-[#1e2736] flex items-center gap-2 ${
              brdCached ? 'bg-[#45c4b010]' : 'bg-[#58b0ff08]'
            }`}>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded ${
                  brdCached
                    ? 'text-[#45c4b0] bg-[#45c4b018]'
                    : 'text-[#58b0ff] bg-[#58b0ff18]'
                }`}
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {brdCached ? 'Cached' : 'Fresh'}
              </span>
              <span
                className="text-[9px] text-[#5b6577]"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {brdCached ? 'Served from cache — code unchanged' : 'Newly generated from source'}
              </span>
            </div>
            {brdGeneratedAt && (
              <div className="px-3 py-1 border-b border-[#1e2736]">
                <span
                  className="text-[9px] text-[#5b6577]"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Generated {new Date(brdGeneratedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{', '}
                  {new Date(brdGeneratedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            )}
            {brdUpdateAvailable && brdLatestCommitInfo && (
              <div className="px-3 py-2 bg-[#d2992210] border-b border-[#d2992230]">
                <div className="flex items-start gap-2">
                  <span className="text-[11px] leading-none mt-0.5" style={{ color: '#d29922' }}>&#9888;</span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[10px] text-[#d29922] font-semibold"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      Newer commits found on GitHub
                    </p>
                    <p
                      className="text-[9px] text-[#5b6577] mt-0.5"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      BRD generated: {brdGeneratedAt ? new Date(brdGeneratedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + new Date(brdGeneratedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'unknown'}
                      {'  ·  Latest commit: '}
                      {brdLatestCommitInfo.date ? new Date(brdLatestCommitInfo.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'unknown'}
                    </p>
                    <button
                      onClick={handleFetchAndRegenerate}
                      className="mt-1.5 text-[9px] text-[#d29922] hover:text-[#e6b84d] border border-[#d2992240] hover:border-[#d2992260] px-2 py-0.5 rounded transition-colors"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      Fetch &amp; Regenerate
                    </button>
                  </div>
                </div>
              </div>
            )}
            <BrdCrossRefPanel
              data={brdData}
              filePath={brdFilePath}
              selectedFile={selectedFile}
              activeLines={activeLineRange}
              onNavigateToLines={handleNavigateToLines}
              onOpenFullBrd={handleOpenFullBrd}
              onClose={handleCloseBrdPanel}
              onSwitchFile={(path) => setSelectedFile(path)}
            />
          </div>
        ) : (
          <div className="w-[360px] border-l border-[#1e2736] bg-[#0c1018] flex flex-col">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e2736]">
              <span
                className="text-[11px] font-semibold text-[#e6edf7]"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                BRD Cross-Reference
              </span>
              <button
                onClick={handleCloseBrdPanel}
                className="text-[#5b6577] hover:text-[#e6edf7] transition-colors text-[16px] leading-none px-1"
              >
                &times;
              </button>
            </div>
            <div className="flex-1" />
          </div>
        )
      ) : (
        // Reviews Panel
        <div className="w-[360px] border-l border-[#1e2736] bg-[#0c1018] flex flex-col">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e2736]">
            <span
              className="text-[11px] font-semibold text-[#e6edf7]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Business Review
            </span>
            <div className="flex items-center gap-2">
              {reviews.length > 0 && (
                <button
                  onClick={() => {
                    const text = reviews.map(r => [
                      `File: ${r.filePath}`,
                      `Date: ${r.timestamp.toLocaleString()}`,
                      ``,
                      `--- Selected Code ---`,
                      r.snippet,
                      ``,
                      `--- Business Logic ---`,
                      r.summary,
                      ``,
                      `${'='.repeat(60)}`,
                      ``,
                    ].join('\n')).join('\n');
                    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `business_reviews_${new Date().toISOString().split('T')[0]}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="text-[9px] text-[#5b6577] hover:text-[#9fb0c6] border border-[#1e2736] hover:border-[#3a4250] px-1.5 py-0.5 rounded transition-colors"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  title="Download all reviews"
                >
                  Export All
                </button>
              )}
              <span
                className="text-[10px] text-[#5b6577]"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Loading state */}
            {loading && (
              <div className="px-3 py-4 border-b border-[#1e2736]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 border-2 border-[#45c4b0] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] text-[#7a869a]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    Analyzing...
                  </span>
                </div>
                <div className="bg-[#111823] border border-[#232c3c] rounded-md p-2 mb-2">
                  <pre className="text-[10px] text-[#5b6577] whitespace-pre-wrap break-all max-h-16 overflow-hidden" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {selectedText.slice(0, 200)}{selectedText.length > 200 ? '...' : ''}
                  </pre>
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="px-3 py-3 border-b border-[#1e2736]">
                <div className="bg-[#ef444420] border border-[#ef4444] rounded-md p-2.5">
                  <span className="text-[11px] text-[#ef4444]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {error}
                  </span>
                </div>
              </div>
            )}

            {/* Review history */}
            {reviews.map(review => (
              <ReviewCard
                key={review.id}
                review={review}
                onRegenerate={handleRegenerate}
                onHighlightLines={(start, end) => {
                  if (review.filePath !== selectedFile) {
                    setSelectedFile(review.filePath);
                  }
                  setHighlightedLines({ start, end });
                  requestAnimationFrame(() => {
                    const el = lineRefs.current.get(start);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  });
                }}
              />
            ))}

            {/* Empty state */}
            {!loading && reviews.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                <span className="text-2xl mb-3 opacity-30">▤</span>
                <p className="text-[12px] text-[#5b6577] mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  No reviews yet
                </p>
                <p className="text-[11px] text-[#3a4250] leading-relaxed">
                  Select a section of COBOL code in the editor and click &quot;Review&quot; to get a plain-English business logic explanation.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BRD Modal */}
      <BrdModal
        open={brdModalOpen}
        onClose={() => setBrdModalOpen(false)}
        loading={brdLoading}
        error={brdError}
        data={brdData}
        filePath={brdFilePath}
      />
    </div>
  );
}
