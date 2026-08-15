'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

const FEATURES = [
  { title: 'Impact Preview', desc: 'Edit COBOL code with real-time impact preview across programs and copybooks', icon: '⚡' },
  { title: 'AI Analysis', desc: 'AI-powered change analysis identifies affected components and potential risks', icon: '◎' },
  { title: 'Approval Workflow', desc: 'Built-in Draft, Review, and Approval flow for governed change management', icon: '⇌' },
];

interface FluxConnectViewProps {
  onConnect: (url: string) => void;
}

export function FluxConnectView({ onConnect }: FluxConnectViewProps) {
  const [repoInput, setRepoInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const connect = useCallback(() => {
    const url = repoInput || 'github.com/legacy-bank/core-cobol';
    setConnecting(true);
    setProgress(0);

    let p = 0;
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      p += 1;
      setProgress(Math.min(100, p * 8));

      if (p * 8 >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(() => {
          setConnecting(false);
          onConnect(url);
        }, 300);
      }
    }, 120);
  }, [repoInput, onConnect]);

  return (
    <div className="flex-1 flex items-center justify-center overflow-auto p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1
            className="text-3xl font-bold text-[#e6edf7] mb-3"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Code Flux
          </h1>
          <p className="text-sm text-[#7a869a]">
            Connect a COBOL repository to start making governed changes with impact preview
          </p>
        </div>

        {/* Repo input */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={repoInput}
            onChange={e => setRepoInput(e.target.value)}
            placeholder="github.com/org/cobol-repo"
            disabled={connecting}
            className="flex-1 px-4 py-3 bg-[#111823] border border-[#232c3c] rounded-lg text-sm text-[#dbe4f0] placeholder-[#4a5568] focus:outline-none focus:border-[#3b82f6] disabled:opacity-50"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            onKeyDown={e => e.key === 'Enter' && !connecting && connect()}
          />
          <button
            onClick={connect}
            disabled={connecting}
            className="px-6 py-3 bg-[#45c4b0] hover:bg-[#3aad9c] text-[#0a0e14] font-semibold text-sm rounded-lg transition-colors disabled:opacity-50"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {connecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>

        {/* Progress bar */}
        {connecting && (
          <div className="mb-8">
            <div className="flex justify-between text-[10px] text-[#5b6577] mb-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <span>
                {progress < 30 ? 'Cloning repository...' :
                 progress < 60 ? 'Indexing COBOL sources...' :
                 progress < 85 ? 'Building file tree...' :
                 'Ready'}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-[#111823] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#45c4b0] to-[#3b82f6] rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Features */}
        {!connecting && (
          <div className="grid gap-3">
            {FEATURES.map(f => (
              <div key={f.title} className="flex items-start gap-4 px-5 py-4 bg-[#0c1018] border border-[#1e2736] rounded-lg">
                <span className="text-lg mt-0.5">{f.icon}</span>
                <div>
                  <span
                    className="block text-[12px] font-semibold text-[#e6edf7] mb-1"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {f.title}
                  </span>
                  <p className="text-[11px] text-[#7a869a] leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
