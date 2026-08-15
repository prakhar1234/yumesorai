'use client';

import { useState } from 'react';
import { ProductSwitcher } from './ProductSwitcher';

interface TopBarProps {
  activeProduct: 'demystifier' | 'codeflux' | 'transformer';
  onProductChange: (product: string) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
}

export function TopBar({ activeProduct, onProductChange, searchValue, onSearchChange, showSearch }: TopBarProps) {
  const [role, setRole] = useState<'dev' | 'ba'>('dev');

  return (
    <div className="flex items-center justify-between h-12 px-4 bg-[#0c1018] border-b border-[#1e2736]">
      {/* Left: Logo + Product Switcher */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-semibold tracking-wide text-[#7a869a]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          YUMESORAI
        </span>
        <span className="text-[#2a3140]">|</span>
        <ProductSwitcher active={activeProduct} onChange={onProductChange} />
      </div>

      {/* Center: Search */}
      {showSearch && (
        <div className="flex-1 max-w-md mx-8">
          <input
            type="text"
            value={searchValue || ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search nodes..."
            className="w-full px-3 py-1.5 text-xs bg-[#111823] border border-[#232c3c] rounded-md text-[#9fb0c6] placeholder-[#4a5568] focus:outline-none focus:border-[#3b82f6]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          />
        </div>
      )}

      {/* Right: Role Toggle + User */}
      <div className="flex items-center gap-4">
        <div className="flex rounded-md overflow-hidden border border-[#232c3c]">
          <button
            onClick={() => setRole('dev')}
            className={`px-3 py-1 text-[10.5px] font-medium transition-colors ${
              role === 'dev' ? 'bg-[#1e2d42] text-[#60a5fa]' : 'bg-[#111823] text-[#5b6577] hover:text-[#7a869a]'
            }`}
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            DEV
          </button>
          <button
            onClick={() => setRole('ba')}
            className={`px-3 py-1 text-[10.5px] font-medium transition-colors ${
              role === 'ba' ? 'bg-[#1e2d42] text-[#60a5fa]' : 'bg-[#111823] text-[#5b6577] hover:text-[#7a869a]'
            }`}
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            BA
          </button>
        </div>
        <div className="w-7 h-7 rounded-full bg-[#1e2d42] border border-[#2a3140] flex items-center justify-center">
          <span className="text-[10px] text-[#7a869a]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>U</span>
        </div>
      </div>
    </div>
  );
}
