'use client';

interface GraphControlsProps {
  viewMode: '2d' | '3d';
  colorMode: 'domain' | 'risk';
  onViewModeChange: (mode: '2d' | '3d') => void;
  onColorModeChange: (mode: 'domain' | 'risk') => void;
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onImpact: () => void;
  onPathTrace: () => void;
  onClearMode: () => void;
  hasActiveMode: boolean;
  deadHi: boolean;
  onDeadHiChange: (v: boolean) => void;
  showCoverage: boolean;
  onCoverageToggle: () => void;
  hasCoverage: boolean;
}

export function GraphControls({
  viewMode, colorMode, onViewModeChange, onColorModeChange,
  onFitView, onZoomIn, onZoomOut, onImpact, onPathTrace,
  onClearMode, hasActiveMode, deadHi, onDeadHiChange,
  showCoverage, onCoverageToggle, hasCoverage,
}: GraphControlsProps) {
  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* View mode toggle */}
      <div className="flex rounded-md overflow-hidden border border-[#232c3c]">
        <button
          onClick={() => onViewModeChange('2d')}
          className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${
            viewMode === '2d' ? 'bg-[#1e2d42] text-[#60a5fa]' : 'bg-[#111823] text-[#5b6577] hover:text-[#7a869a]'
          }`}
        >
          2D
        </button>
        <button
          onClick={() => onViewModeChange('3d')}
          className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${
            viewMode === '3d' ? 'bg-[#1e2d42] text-[#60a5fa]' : 'bg-[#111823] text-[#5b6577] hover:text-[#7a869a]'
          }`}
        >
          3D
        </button>
      </div>

      {/* Color mode toggle */}
      <div className="flex rounded-md overflow-hidden border border-[#232c3c]">
        <button
          onClick={() => onColorModeChange('domain')}
          className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
            colorMode === 'domain' ? 'bg-[#1e2d42] text-[#60a5fa]' : 'bg-[#111823] text-[#5b6577] hover:text-[#7a869a]'
          }`}
        >
          Domain
        </button>
        <button
          onClick={() => onColorModeChange('risk')}
          className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
            colorMode === 'risk' ? 'bg-[#1e2d42] text-[#60a5fa]' : 'bg-[#111823] text-[#5b6577] hover:text-[#7a869a]'
          }`}
        >
          Risk
        </button>
      </div>

      {/* Zoom controls */}
      <div className="flex flex-col rounded-md overflow-hidden border border-[#232c3c]">
        <button onClick={onZoomIn} className="px-3 py-1.5 bg-[#111823] text-[#9fb0c6] hover:bg-[#182233] text-[12px] transition-colors">
          +
        </button>
        <button onClick={onFitView} className="px-3 py-1.5 bg-[#111823] text-[#9fb0c6] hover:bg-[#182233] text-[10px] transition-colors border-y border-[#232c3c]">
          Fit
        </button>
        <button onClick={onZoomOut} className="px-3 py-1.5 bg-[#111823] text-[#9fb0c6] hover:bg-[#182233] text-[12px] transition-colors">
          −
        </button>
      </div>

      {/* Analysis tools */}
      <div className="flex flex-col gap-1 mt-1">
        <button
          onClick={onImpact}
          className="px-3 py-1.5 bg-[#111823] border border-[#232c3c] rounded-md text-[10px] text-[#9fb0c6] hover:bg-[#182233] transition-colors"
        >
          Impact
        </button>
        <button
          onClick={onPathTrace}
          className="px-3 py-1.5 bg-[#111823] border border-[#232c3c] rounded-md text-[10px] text-[#9fb0c6] hover:bg-[#182233] transition-colors"
        >
          Path
        </button>
        <button
          onClick={() => onDeadHiChange(!deadHi)}
          className={`px-3 py-1.5 border rounded-md text-[10px] transition-colors ${
            deadHi
              ? 'bg-[#2a1215] border-[#5c2b2e] text-[#ff8a80]'
              : 'bg-[#111823] border-[#232c3c] text-[#9fb0c6] hover:bg-[#182233]'
          }`}
        >
          Dead
        </button>
        {hasCoverage && (
          <button
            onClick={onCoverageToggle}
            className={`px-3 py-1.5 border rounded-md text-[10px] transition-colors ${
              showCoverage
                ? 'bg-[#0f2318] border-[#1e4d30] text-[#4ade80]'
                : 'bg-[#111823] border-[#232c3c] text-[#9fb0c6] hover:bg-[#182233]'
            }`}
          >
            Coverage
          </button>
        )}
        {hasActiveMode && (
          <button
            onClick={onClearMode}
            className="px-3 py-1.5 bg-[#1c1428] border border-[#3a2d50] rounded-md text-[10px] text-[#a78bfa] hover:bg-[#251d38] transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
