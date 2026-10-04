'use client';

import { useState, useCallback, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface FileEntry {
  name: string;
  path: string;
  loc: number;
  type: string;
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
    const fileType = ext === '.cpy' ? 'cpy'
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
// Impact analysis mock data
// ---------------------------------------------------------------------------
interface ImpactItem {
  name: string;
  type: 'program' | 'copybook' | 'jcl';
  impact: 'direct' | 'indirect';
  reason: string;
}

const IMPACT_DATA: ImpactItem[] = [
  { name: 'BILL0030.cbl', type: 'program', impact: 'direct', reason: 'Contains validation logic being modified' },
  { name: 'BILL0040.cbl', type: 'program', impact: 'indirect', reason: 'Uses BILLREC copybook with shared fields' },
  { name: 'BILLREC.cpy', type: 'copybook', impact: 'direct', reason: 'May need new field for validation flag' },
  { name: 'BILLCYCL.jcl', type: 'jcl', impact: 'indirect', reason: 'Runs BILL0030; may need updated return codes' },
];

// ---------------------------------------------------------------------------
// Syntax highlighting
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
type ApprovalStatus = 'draft' | 'review' | 'approved' | 'rejected';

interface FluxWorkspaceProps {
  repoUrl: string;
  branch: string;
  initialSources: SourceFile[];
  initialCached: boolean;
  onDisconnect: () => void;
}

export function FluxWorkspace({ repoUrl, branch, initialSources, initialCached, onDisconnect }: FluxWorkspaceProps) {
  // Derived data from pre-fetched sources
  const fileTree = useMemo(() => buildFileTree(initialSources), [initialSources]);
  const fileContents = useMemo(() => {
    const map: Record<string, string> = {};
    for (const src of initialSources) {
      map[src.path] = src.content;
    }
    return map;
  }, [initialSources]);

  // UI state
  const [selectedFile, setSelectedFile] = useState<string>(
    () => initialSources.length > 0 ? initialSources[0].path : ''
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(buildFileTree(initialSources).map(f => f.name))
  );
  const [changeDescription, setChangeDescription] = useState('');
  const [showImpact, setShowImpact] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('draft');
  const [analyzing, setAnalyzing] = useState(false);

  const toggleFolder = useCallback((name: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleSubmitChange = useCallback(() => {
    if (!changeDescription.trim()) return;
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setShowImpact(true);
      setApprovalStatus('draft');
    }, 1500);
  }, [changeDescription]);

  const handleStatusAdvance = useCallback(() => {
    setApprovalStatus(prev => {
      if (prev === 'draft') return 'review';
      if (prev === 'review') return 'approved';
      return prev;
    });
  }, []);

  const handleReject = useCallback(() => {
    setApprovalStatus('rejected');
  }, []);

  const handleReset = useCallback(() => {
    setShowImpact(false);
    setChangeDescription('');
    setApprovalStatus('draft');
  }, []);

  const content = fileContents[selectedFile] || '      * File content not available';
  const lines = content.split('\n');
  const fileEntry = fileTree.flatMap(f => f.children).find(f => f.path === selectedFile);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Sidebar - File Tree */}
      <div className="w-[240px] border-r border-[#1e2736] bg-[#0c1018] flex flex-col">
        {/* Repo header */}
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
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[10px] text-[#5b6577]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {branch}
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded ${
                initialCached
                  ? 'bg-[#45c4b020] text-[#45c4b0]'
                  : 'bg-[#60a5fa20] text-[#60a5fa]'
              }`}
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {initialCached ? 'Cached' : 'Fresh'}
            </span>
          </div>
        </div>

        {/* File tree */}
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
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file.path)}
                  className={`flex items-center justify-between w-full pl-7 pr-3 py-1 text-left transition-colors ${
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
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Center - Code Viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* File tab bar */}
        <div className="flex items-center h-9 px-3 bg-[#0c1018] border-b border-[#1e2736]">
          <span
            className="text-[11px] text-[#9fb0c6]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {selectedFile}
          </span>
          {fileEntry && (
            <span
              className="text-[10px] text-[#5b6577] ml-3"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {fileEntry.loc.toLocaleString()} LOC
            </span>
          )}
        </div>

        {/* Code content */}
        <div className="flex-1 overflow-auto bg-[#0a0e14]">
          <pre className="text-[12px] leading-[1.6]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            <code>
              {lines.map((line, i) => (
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

        {/* Bottom bar - Change composer */}
        <div className="border-t border-[#1e2736] bg-[#0c1018] p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={changeDescription}
              onChange={e => setChangeDescription(e.target.value)}
              placeholder="Describe a change... e.g. 'Add validation for negative bill amounts'"
              className="flex-1 px-3 py-2 bg-[#111823] border border-[#232c3c] rounded-md text-[12px] text-[#dbe4f0] placeholder-[#4a5568] focus:outline-none focus:border-[#3b82f6]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              onKeyDown={e => e.key === 'Enter' && handleSubmitChange()}
            />
            <button
              onClick={handleSubmitChange}
              disabled={!changeDescription.trim() || analyzing}
              className="px-4 py-2 bg-[#45c4b0] hover:bg-[#3aad9c] text-[#0a0e14] font-semibold text-[11px] rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {analyzing ? 'Analyzing...' : 'Preview Impact'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Impact Preview */}
      {showImpact && (
        <div className="w-[320px] border-l border-[#1e2736] bg-[#0c1018] flex flex-col">
          {/* Panel header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e2736]">
            <span
              className="text-[11px] font-semibold text-[#e6edf7]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Impact Preview
            </span>
            <button
              onClick={handleReset}
              className="text-[10px] text-[#5b6577] hover:text-[#9fb0c6] transition-colors"
            >
              Close
            </button>
          </div>

          {/* Change description */}
          <div className="px-3 py-3 border-b border-[#1e2736]">
            <span
              className="text-[10px] text-[#5b6577] uppercase tracking-wider block mb-1"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Proposed Change
            </span>
            <p className="text-[11px] text-[#dbe4f0] leading-relaxed">
              {changeDescription}
            </p>
          </div>

          {/* Affected components */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <span
              className="text-[10px] text-[#5b6577] uppercase tracking-wider block mb-2"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Affected Components ({IMPACT_DATA.length})
            </span>
            <div className="space-y-2">
              {IMPACT_DATA.map(item => (
                <div
                  key={item.name}
                  className="p-2.5 bg-[#111823] border border-[#232c3c] rounded-md"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-[11px] text-[#e6edf7]"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {item.name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded ${
                        item.impact === 'direct'
                          ? 'bg-[#f9731620] text-[#f97316]'
                          : 'bg-[#60a5fa20] text-[#60a5fa]'
                      }`}
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {item.impact}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#7a869a] leading-relaxed">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Approval workflow */}
          <div className="border-t border-[#1e2736] p-3">
            {/* Status steps */}
            <div className="flex items-center justify-between mb-3">
              {(['draft', 'review', 'approved'] as const).map((step, i) => {
                const isCurrent = approvalStatus === step;
                const isPast =
                  (step === 'draft' && (approvalStatus === 'review' || approvalStatus === 'approved')) ||
                  (step === 'review' && approvalStatus === 'approved');
                const isRejected = approvalStatus === 'rejected';

                return (
                  <div key={step} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold ${
                          isRejected && step !== 'draft'
                            ? 'border border-[#ef4444] text-[#ef4444]'
                            : isPast
                            ? 'bg-[#45c4b0] text-[#0a0e14]'
                            : isCurrent
                            ? 'bg-[#60a5fa] text-[#0a0e14]'
                            : 'border border-[#232c3c] text-[#5b6577]'
                        }`}
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {isPast ? '✓' : i + 1}
                      </div>
                      <span
                        className={`text-[9px] mt-1 capitalize ${
                          isCurrent ? 'text-[#e6edf7]' : 'text-[#5b6577]'
                        }`}
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {step}
                      </span>
                    </div>
                    {i < 2 && (
                      <div
                        className={`w-12 h-px mx-1 ${
                          isPast ? 'bg-[#45c4b0]' : 'bg-[#232c3c]'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            {approvalStatus === 'rejected' ? (
              <div className="space-y-2">
                <div className="text-center py-1.5 px-3 bg-[#ef444420] border border-[#ef4444] rounded-md">
                  <span
                    className="text-[11px] text-[#ef4444]"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    Change Rejected
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full py-2 text-[11px] text-[#9fb0c6] bg-[#111823] border border-[#232c3c] rounded-md hover:bg-[#182233] transition-colors"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Start Over
                </button>
              </div>
            ) : approvalStatus === 'approved' ? (
              <div className="space-y-2">
                <div className="text-center py-1.5 px-3 bg-[#45c4b020] border border-[#45c4b0] rounded-md">
                  <span
                    className="text-[11px] text-[#45c4b0]"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    Change Approved
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full py-2 text-[11px] text-[#9fb0c6] bg-[#111823] border border-[#232c3c] rounded-md hover:bg-[#182233] transition-colors"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  New Change
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleStatusAdvance}
                  className="flex-1 py-2 bg-[#45c4b0] hover:bg-[#3aad9c] text-[#0a0e14] font-semibold text-[11px] rounded-md transition-colors"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {approvalStatus === 'draft' ? 'Submit for Review' : 'Approve'}
                </button>
                {approvalStatus === 'review' && (
                  <button
                    onClick={handleReject}
                    className="px-4 py-2 bg-[#ef444420] text-[#ef4444] text-[11px] rounded-md hover:bg-[#ef444430] transition-colors"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    Reject
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
