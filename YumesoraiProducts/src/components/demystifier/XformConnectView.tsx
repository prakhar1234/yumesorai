'use client';

import { useState } from 'react';

interface XformConnectViewProps {
  onConnect: (lang: string, db: string) => void;
}

const LPARS = ['DEVT1', 'DEVT2', 'PROD1'];

const LANGUAGES = [
  { id: 'java', label: 'Java / Spring Boot' },
  { id: 'csharp', label: 'C# / .NET 8' },
  { id: 'python', label: 'Python / FastAPI' },
  { id: 'microservices', label: 'Cloud microservices' },
];

const DATABASES = [
  { id: 'postgresql', label: 'PostgreSQL' },
  { id: 'oracle', label: 'Oracle' },
  { id: 'mssql', label: 'MS SQL' },
  { id: 'dynamodb', label: 'DynamoDB' },
];

export function XformConnectView({ onConnect }: XformConnectViewProps) {
  const [host, setHost] = useState('');
  const [lpar, setLpar] = useState(LPARS[0]);
  const [lang, setLang] = useState('java');
  const [db, setDb] = useState('postgresql');

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#112030] border border-[#1e2736] mb-4">
            <span className="text-2xl text-[#45c4b0]">{'\u27BF'}</span>
          </div>
          <h1
            className="text-xl font-semibold text-[#e6edf7] mb-2"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Transformer
          </h1>
          <p className="text-[12px] text-[#7a869a] leading-relaxed max-w-md mx-auto" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Transformer reads COBOL from the repository, runs the original binaries on the mainframe you connect, and verifies every conversion with parallel runs against that server.
          </p>
        </div>

        {/* Form */}
        <div className="bg-[#0c1018] border border-[#1e2736] rounded-xl p-6 space-y-5">
          {/* Mainframe host */}
          <div>
            <label
              className="block text-[11px] font-medium text-[#7a869a] mb-1.5 uppercase tracking-wider"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Mainframe host
            </label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="mvs-prod.acme.com"
              className="w-full px-3 py-2 text-[13px] bg-[#111823] border border-[#232c3c] rounded-lg text-[#dbe4f0] placeholder-[#4a5568] focus:outline-none focus:border-[#45c4b0] transition-colors"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            />
          </div>

          {/* LPAR */}
          <div>
            <label
              className="block text-[11px] font-medium text-[#7a869a] mb-1.5 uppercase tracking-wider"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              LPAR
            </label>
            <select
              value={lpar}
              onChange={(e) => setLpar(e.target.value)}
              className="w-full px-3 py-2 text-[13px] bg-[#111823] border border-[#232c3c] rounded-lg text-[#dbe4f0] focus:outline-none focus:border-[#45c4b0] transition-colors appearance-none cursor-pointer"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {LPARS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Target language */}
          <div>
            <label
              className="block text-[11px] font-medium text-[#7a869a] mb-1.5 uppercase tracking-wider"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Target language
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLang(l.id)}
                  className={`px-3 py-2 text-[12px] rounded-lg border transition-colors text-left ${
                    lang === l.id
                      ? 'bg-[#112030] border-[#45c4b0] text-[#45c4b0]'
                      : 'bg-[#111823] border-[#232c3c] text-[#9fb0c6] hover:border-[#3a4a5c]'
                  }`}
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target database */}
          <div>
            <label
              className="block text-[11px] font-medium text-[#7a869a] mb-1.5 uppercase tracking-wider"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Target database
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DATABASES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDb(d.id)}
                  className={`px-3 py-2 text-[12px] rounded-lg border transition-colors text-left ${
                    db === d.id
                      ? 'bg-[#112030] border-[#45c4b0] text-[#45c4b0]'
                      : 'bg-[#111823] border-[#232c3c] text-[#9fb0c6] hover:border-[#3a4a5c]'
                  }`}
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Connect button */}
          <button
            onClick={() => onConnect(lang, db)}
            className="w-full py-2.5 text-[13px] font-semibold rounded-lg bg-[#45c4b0] text-[#0a0e14] hover:bg-[#3db3a0] transition-colors"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Connect &amp; Scan Repository
          </button>
        </div>
      </div>
    </div>
  );
}
