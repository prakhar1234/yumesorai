'use client';

import { useState, useRef, useEffect } from 'react';

const PRODUCTS = [
  { id: 'demystifier', label: 'Demistifier', desc: 'COBOL knowledge graph · impact analysis', icon: '◎' },
  { id: 'codeflux', label: 'Code Flux', desc: 'Change workflow · impact preview · approvals', icon: '⇌' },
  { id: 'transformer', label: 'Transformer', desc: 'COBOL → modern language · cloud-ready', icon: '⟿' },
];

interface ProductSwitcherProps {
  active: string;
  onChange: (product: string) => void;
}

export function ProductSwitcher({ active, onChange }: ProductSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = PRODUCTS.find(p => p.id === active) || PRODUCTS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[#182233] transition-colors"
      >
        <span className="text-[14px] text-[#45c4b0]">{current.icon}</span>
        <span className="text-[13px] font-semibold text-[#e6edf7]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {current.label}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-[#5b6577]">
          <path d="M2 4 L5 7 L8 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-[#111823] border border-[#232c3c] rounded-lg shadow-xl z-50 py-1">
          {PRODUCTS.map(p => (
            <button
              key={p.id}
              onClick={() => { onChange(p.id); setOpen(false); }}
              className={`flex items-start gap-3 w-full px-3 py-2.5 text-left rounded-md transition-colors ${
                p.id === active ? 'bg-[#182233]' : 'hover:bg-[#182233]'
              }`}
            >
              <span className="text-[16px] mt-0.5" style={{ color: p.id === active ? '#45c4b0' : '#5b6577' }}>{p.icon}</span>
              <span>
                <span className="block text-[12px] font-semibold text-[#e6edf7]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {p.label}
                </span>
                <span className="block text-[10.5px] text-[#7a869a]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  {p.desc}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
