'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from './TopBar';
import { XformConnectView } from './XformConnectView';
import { XformWorkspace } from './XformWorkspace';

export function TransformerClient() {
  const router = useRouter();
  const [view, setView] = useState<'connect' | 'workspace'>('connect');
  const [targetLang, setTargetLang] = useState('java');
  const [targetDb, setTargetDb] = useState('postgresql');

  const handleProductChange = useCallback((product: string) => {
    if (product === 'demystifier') router.push('/demystifier');
    else if (product === 'codeflux') router.push('/demystifier/codeflux');
  }, [router]);

  const handleConnect = useCallback((lang: string, db: string) => {
    setTargetLang(lang);
    setTargetDb(db);
    setView('workspace');
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        activeProduct="transformer"
        onProductChange={handleProductChange}
      />
      {view === 'connect' ? (
        <XformConnectView onConnect={handleConnect} />
      ) : (
        <XformWorkspace targetLang={targetLang} targetDb={targetDb} onBack={() => setView('connect')} />
      )}
    </div>
  );
}
