'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from './TopBar';
import { InputView } from './InputView';
import { GraphView } from './GraphView';
import type { GraphData, CoverageData } from './types';

export function DemystifierClient() {
  const router = useRouter();
  const [view, setView] = useState<'input' | 'graph'>('input');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [repoLabel, setRepoLabel] = useState('');
  const [search, setSearch] = useState('');
  const [coverage, setCoverage] = useState<CoverageData | null>(null);

  const handleProductChange = useCallback((product: string) => {
    if (product === 'codeflux') router.push('/demystifier/codeflux');
    else if (product === 'transformer') router.push('/demystifier/transformer');
  }, [router]);

  const handleAnalyzeComplete = useCallback((data: GraphData & { coverage?: CoverageData }, label: string) => {
    const { coverage: cov, ...graphOnly } = data;
    setGraphData(graphOnly);
    setCoverage(cov ?? null);
    setRepoLabel(label);
    setView('graph');
  }, []);

  const handleNewAnalysis = useCallback(() => {
    setView('input');
    setGraphData(null);
    setCoverage(null);
    setSearch('');
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        activeProduct="demystifier"
        onProductChange={handleProductChange}
        searchValue={search}
        onSearchChange={setSearch}
        showSearch={view === 'graph'}
      />
      {view === 'input' ? (
        <InputView onAnalyzeComplete={handleAnalyzeComplete} />
      ) : (
        graphData && (
          <GraphView
            data={graphData}
            repoLabel={repoLabel}
            search={search}
            onNewAnalysis={handleNewAnalysis}
            coverage={coverage}
          />
        )
      )}
    </div>
  );
}
