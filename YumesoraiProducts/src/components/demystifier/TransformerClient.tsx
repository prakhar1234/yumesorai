'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from './TopBar';
import { XformConnectView } from './XformConnectView';
import { XformWorkspace } from './XformWorkspace';

interface SourceFile {
  path: string;
  name: string;
  ext: string;
  type: string;
  content: string;
}

export function TransformerClient() {
  const router = useRouter();
  const [view, setView] = useState<'connect' | 'workspace'>('connect');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [commitSha, setCommitSha] = useState('');
  const [targetLang, setTargetLang] = useState('java');
  const [targetDb, setTargetDb] = useState('postgresql');

  const handleProductChange = useCallback((product: string) => {
    if (product === 'demystifier') router.push('/demystifier');
    else if (product === 'codeflux') router.push('/demystifier/codeflux');
    else if (product === 'business-review') router.push('/demystifier/business-review');
  }, [router]);

  const handleConnect = useCallback((
    url: string,
    branchName: string,
    result: { sources: SourceFile[]; commit_sha: string },
    lang: string,
    db: string,
  ) => {
    setRepoUrl(url);
    setBranch(branchName);
    setSources(result.sources);
    setCommitSha(result.commit_sha);
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
        <XformWorkspace
          repoUrl={repoUrl}
          branch={branch}
          sources={sources}
          commitSha={commitSha}
          targetLang={targetLang}
          targetDb={targetDb}
          onBack={() => setView('connect')}
        />
      )}
    </div>
  );
}
