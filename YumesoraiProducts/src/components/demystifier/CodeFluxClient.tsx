'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from './TopBar';
import { FluxConnectView } from './FluxConnectView';
import { FluxWorkspace } from './FluxWorkspace';

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

export function CodeFluxClient() {
  const router = useRouter();
  const [view, setView] = useState<'connect' | 'workspace'>('connect');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const sourcesRef = useRef<SourcesResult | null>(null);

  const handleProductChange = useCallback((product: string) => {
    if (product === 'demystifier') router.push('/demystifier');
    else if (product === 'transformer') router.push('/demystifier/transformer');
  }, [router]);

  const handleConnect = useCallback((url: string, branchName: string, result: SourcesResult) => {
    setRepoUrl(url);
    setBranch(branchName);
    sourcesRef.current = result;
    setView('workspace');
  }, []);

  const handleDisconnect = useCallback(() => {
    setView('connect');
    setRepoUrl('');
    setBranch('main');
    sourcesRef.current = null;
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0a0e14]">
      <TopBar
        activeProduct="codeflux"
        onProductChange={handleProductChange}
      />
      {view === 'connect' ? (
        <FluxConnectView onConnect={handleConnect} />
      ) : (
        <FluxWorkspace
          repoUrl={repoUrl}
          branch={branch}
          initialSources={sourcesRef.current!.sources}
          initialCached={sourcesRef.current!.cached}
          onDisconnect={handleDisconnect}
        />
      )}
    </div>
  );
}
