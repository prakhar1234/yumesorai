'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from './TopBar';
import { InputView } from './InputView';
import { GraphView } from './GraphView';
import { ArchitectureView } from './ArchitectureView';
import { SourcePreviewPopup } from './SourcePreviewPopup';
import { layoutGraph, buildAdjacency } from './graphUtils';
import { useBackgroundTask } from './background-tasks/useBackgroundTask';
import type { GraphData, CoverageData } from './types';
import type { DemystifierScanResult } from './background-tasks/types';

type ViewState = 'input' | 'graph' | 'architecture';

export function DemystifierClient() {
  const router = useRouter();
  const [view, setView] = useState<ViewState>('input');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [repoLabel, setRepoLabel] = useState('');
  const [search, setSearch] = useState('');
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoBranch, setRepoBranch] = useState('main');

  // Source preview state
  const [sources, setSources] = useState<Record<string, string>>({});
  const [sourceViewNodeId, setSourceViewNodeId] = useState<string | null>(null);

  // Background task hook
  const { start: startBgTask, latestResult, runningTask } = useBackgroundTask<DemystifierScanResult>('demystifier', 'demystifier-scan');
  const restoredRef = useRef(false);

  // Restore from background task result on mount (or when returning to page)
  useEffect(() => {
    if (latestResult && !graphData && !restoredRef.current) {
      restoredRef.current = true;
      const data = latestResult.graphData;
      // Re-layout since positions aren't serialized
      layoutGraph(data);
      buildAdjacency(data);
      setGraphData(data);
      setCoverage(latestResult.coverage);
      setRepoLabel(latestResult.repoLabel);
      setRepoUrl(latestResult.repoUrl);
      setRepoBranch(latestResult.branch);
      setSources(latestResult.sources);
      setView('graph');
    }
  }, [latestResult, graphData]);

  const handleProductChange = useCallback((product: string) => {
    if (product === 'codeflux') router.push('/demystifier/codeflux');
    else if (product === 'transformer') router.push('/demystifier/transformer');
    else if (product === 'business-review') router.push('/demystifier/business-review');
  }, [router]);

  const handleAnalyzeComplete = useCallback((data: GraphData & { coverage?: CoverageData }, label: string) => {
    const { coverage: cov, ...graphOnly } = data;
    setGraphData(graphOnly);
    setCoverage(cov ?? null);
    setRepoLabel(label);
    // Extract repo URL from label for source fetching
    const url = label.includes('github.com') ? label : `github.com/${label}`;
    setRepoUrl(url);
    setView('graph');
    restoredRef.current = true;
  }, []);

  const shortLabel = (s: string) =>
    s.replace(/^https?:\/\//, '').replace(/^github\.com\//, '').replace(/\.git$/, '');

  // Background scan handler passed to InputView
  const handleStartBackgroundScan = useCallback((scanRepoUrl: string, branch: string, inputType: string) => {
    const label = shortLabel(scanRepoUrl);

    startBgTask(
      `Scanning ${label}`,
      { repo_url: scanRepoUrl, branch, input_type: inputType },
      async (callbacks) => {
        callbacks.setProgress(5, 'Connecting to GitHub...');

        // Pre-check source cache
        let hasSrcCache = false;
        try {
          const checkResp = await fetch('/api/demystifier/sources/check-cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repo_url: scanRepoUrl, branch }),
          });
          if (checkResp.ok) {
            const checkData = await checkResp.json();
            hasSrcCache = checkData.has_cache === true;
          }
        } catch {
          // Non-fatal
        }

        callbacks.checkAborted();
        callbacks.setProgress(10, hasSrcCache ? 'Loading cached sources...' : 'Downloading COBOL sources...');

        // Call the backend API
        const resp = await fetch('/api/demystifier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_url: scanRepoUrl, input_type: inputType, branch }),
        });

        if (!resp.ok) throw new Error(`API error: ${resp.status}`);

        callbacks.checkAborted();
        callbacks.setProgress(70, 'Building dependency graph...');

        const data: GraphData & { coverage?: CoverageData } = await resp.json();
        const { coverage: cov, ...graphOnly } = data;

        callbacks.setProgress(80, 'Computing layout...');
        layoutGraph(graphOnly);
        buildAdjacency(graphOnly);

        callbacks.checkAborted();
        callbacks.setProgress(85, 'Fetching sources...');

        // Fetch sources
        const url = scanRepoUrl.includes('github.com') ? scanRepoUrl : `github.com/${scanRepoUrl}`;
        const sourcesMap: Record<string, string> = {};
        try {
          const srcResp = await fetch('/api/demystifier/sources', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repo_url: url, branch }),
          });
          if (srcResp.ok) {
            const srcData: { sources?: { name: string; content: string }[] } = await srcResp.json();
            if (srcData.sources) {
              srcData.sources.forEach((s) => {
                const baseName = s.name.replace(/\.[^.]+$/, '').toUpperCase();
                sourcesMap[baseName] = s.content;
              });
            }
          }
        } catch {
          // Source fetching is non-critical
        }

        callbacks.setProgress(95, 'Finalizing...');

        return {
          graphData: graphOnly,
          coverage: cov ?? null,
          repoLabel: label,
          repoUrl: url,
          branch,
          sources: sourcesMap,
        } satisfies DemystifierScanResult;
      },
    );
  }, [startBgTask]);

  // Fetch sources after analysis completes (non-background path)
  useEffect(() => {
    if (!graphData || !repoUrl) return;
    // Skip if sources already loaded (e.g. from background task restore)
    if (Object.keys(sources).length > 0) return;
    fetch('/api/demystifier/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: repoUrl, branch: repoBranch }),
    })
      .then(res => res.ok ? res.json() : null)
      .then((data: { sources?: { name: string; content: string }[] } | null) => {
        if (!data?.sources) return;
        const map: Record<string, string> = {};
        data.sources.forEach((s: { name: string; content: string }) => {
          const baseName = s.name.replace(/\.[^.]+$/, '').toUpperCase();
          map[baseName] = s.content;
        });
        setSources(map);
      })
      .catch(() => {
        // Source fetching is non-critical
      });
  }, [graphData, repoUrl, repoBranch, sources]);

  const handleNewAnalysis = useCallback(() => {
    setView('input');
    setGraphData(null);
    setCoverage(null);
    setSearch('');
    setSources({});
    setSourceViewNodeId(null);
    restoredRef.current = false;
  }, []);

  const handleViewSource = useCallback((nodeId: string) => {
    setSourceViewNodeId(nodeId);
  }, []);

  // Find source content for a node — try exact ID match, then label match
  const getSourceForNode = useCallback((nodeId: string): string | null => {
    if (sources[nodeId]) return sources[nodeId];
    const node = graphData?.nodes.find(n => n.id === nodeId);
    if (node) {
      const label = node.label.toUpperCase();
      if (sources[label]) return sources[label];
    }
    return null;
  }, [sources, graphData]);

  // Build a sources availability map for passing to graph views
  const sourcesAvailable = Object.keys(sources).length > 0 ? sources : undefined;

  const sourceViewNode = sourceViewNodeId ? graphData?.nodes.find(n => n.id === sourceViewNodeId) : null;
  const sourceViewContent = sourceViewNodeId ? getSourceForNode(sourceViewNodeId) : null;

  // Background progress for InputView
  const backgroundProgress = runningTask
    ? { progress: runningTask.progress, label: runningTask.progressLabel }
    : null;

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        activeProduct="demystifier"
        onProductChange={handleProductChange}
        searchValue={search}
        onSearchChange={setSearch}
        showSearch={view === 'graph' || view === 'architecture'}
      />
      {view === 'input' ? (
        <InputView
          onAnalyzeComplete={handleAnalyzeComplete}
          onStartBackgroundScan={handleStartBackgroundScan}
          backgroundProgress={backgroundProgress}
        />
      ) : view === 'architecture' ? (
        graphData && (
          <ArchitectureView
            data={graphData}
            repoLabel={repoLabel}
            search={search}
            onNewAnalysis={handleNewAnalysis}
            onSwitchToGraph={() => setView('graph')}
            coverage={coverage}
            sources={sourcesAvailable}
            onViewSource={handleViewSource}
          />
        )
      ) : (
        graphData && (
          <GraphView
            data={graphData}
            repoLabel={repoLabel}
            search={search}
            onNewAnalysis={handleNewAnalysis}
            coverage={coverage}
            onSwitchToArchitecture={() => setView('architecture')}
            sources={sourcesAvailable}
            onViewSource={handleViewSource}
          />
        )
      )}

      {/* Source Preview Popup */}
      {sourceViewNode && sourceViewContent && graphData && (
        <SourcePreviewPopup
          node={sourceViewNode}
          data={graphData}
          sourceContent={sourceViewContent}
          onClose={() => setSourceViewNodeId(null)}
        />
      )}
    </div>
  );
}
