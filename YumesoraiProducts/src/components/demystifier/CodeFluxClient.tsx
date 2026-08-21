'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from './TopBar';
import { FluxConnectView } from './FluxConnectView';
import { FluxWorkspace } from './FluxWorkspace';

export function CodeFluxClient() {
  const router = useRouter();
  const [view, setView] = useState<'connect' | 'workspace'>('connect');
  const [repoUrl, setRepoUrl] = useState('');

  const handleProductChange = useCallback((product: string) => {
    if (product === 'demystifier') router.push('/demystifier');
    else if (product === 'transformer') router.push('/demystifier/transformer');
  }, [router]);

  const handleConnect = useCallback((url: string) => {
    setRepoUrl(url);
    setView('workspace');
  }, []);

  const handleDisconnect = useCallback(() => {
    setView('connect');
    setRepoUrl('');
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
        <FluxWorkspace repoUrl={repoUrl} onDisconnect={handleDisconnect} />
      )}
    </div>
  );
}
