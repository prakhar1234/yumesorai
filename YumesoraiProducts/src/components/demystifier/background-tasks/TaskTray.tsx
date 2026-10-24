'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBackgroundTaskContext } from './BackgroundTaskContext';
import type { BackgroundTask, ProductId } from './types';

const PRODUCT_ROUTES: Record<ProductId, string> = {
  demystifier: '/demystifier',
  codeflux: '/demystifier/codeflux',
  transformer: '/demystifier/transformer',
  'business-review': '/demystifier/business-review',
};

const PRODUCT_LABELS: Record<ProductId, string> = {
  demystifier: 'Demistifier',
  codeflux: 'Code Flux',
  transformer: 'Transformer',
  'business-review': 'Business Review',
};

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function StatusIcon({ status }: { status: BackgroundTask['status'] }) {
  if (status === 'running') {
    return (
      <span className="inline-block w-3.5 h-3.5 border-2 border-[#45c4b0] border-t-transparent rounded-full animate-spin" />
    );
  }
  if (status === 'completed') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" className="text-[#45c4b0]">
        <path d="M3 7 L6 10 L11 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === 'failed') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" className="text-[#ef4444]">
        <path d="M4 4 L10 10 M10 4 L4 10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  // superseded
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className="text-[#5b6577]">
      <path d="M4 4 L10 10 M10 4 L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function TaskTray() {
  const { tasks, dismissTask, clearCompleted } = useBackgroundTaskContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const runningCount = tasks.filter(t => t.status === 'running').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalVisible = tasks.filter(t => t.status !== 'superseded').length;

  if (totalVisible === 0) return null;

  const visibleTasks = tasks
    .filter(t => t.status !== 'superseded')
    .sort((a, b) => b.startedAt - a.startedAt);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[#182233] transition-colors"
      >
        {/* Task icon */}
        <svg width="16" height="16" viewBox="0 0 16 16" className="text-[#7a869a]">
          <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
          <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>

        {/* Count badge */}
        {runningCount > 0 ? (
          <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#45c4b0] text-[#0a0e14] text-[9px] font-bold animate-pulse">
            {runningCount}
          </span>
        ) : completedCount > 0 ? (
          <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#1e2d42] text-[#60a5fa] text-[9px] font-bold">
            {completedCount}
          </span>
        ) : null}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-80 bg-[#111823] border border-[#232c3c] rounded-lg shadow-xl z-50"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#232c3c]">
            <span className="text-[11px] font-semibold text-[#9fb0c6]">Background Tasks</span>
            {tasks.some(t => t.status !== 'running') && (
              <button
                onClick={() => clearCompleted()}
                className="text-[10px] text-[#5b6577] hover:text-[#9fb0c6] transition-colors"
              >
                Clear finished
              </button>
            )}
          </div>

          {/* Task list */}
          <div className="max-h-72 overflow-y-auto py-1">
            {visibleTasks.map(task => (
              <div key={task.id} className="px-3 py-2.5 hover:bg-[#0c1018] transition-colors">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    <StatusIcon status={task.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e2d42] text-[#60a5fa]">
                        {PRODUCT_LABELS[task.product]}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#dbe4f0] truncate">{task.label}</p>

                    {/* Progress bar for running tasks */}
                    {task.status === 'running' && (
                      <div className="mt-1.5">
                        <div className="flex justify-between text-[9px] text-[#5b6577] mb-0.5">
                          <span>{task.progressLabel}</span>
                          <span>{Math.round(task.progress)}%</span>
                        </div>
                        <div className="h-1 bg-[#0c1018] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#45c4b0] to-[#3b82f6] rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Error for failed tasks */}
                    {task.status === 'failed' && task.error && (
                      <p className="text-[10px] text-[#ef4444] mt-1 truncate">{task.error}</p>
                    )}

                    {/* Elapsed time */}
                    <p className="text-[9px] text-[#4a5568] mt-1">
                      {task.status === 'running'
                        ? `Running ${formatElapsed(Date.now() - task.startedAt)}`
                        : task.completedAt
                          ? `Finished in ${formatElapsed(task.completedAt - task.startedAt)}`
                          : ''}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-1.5">
                      {task.status === 'completed' && (
                        <button
                          onClick={() => {
                            router.push(PRODUCT_ROUTES[task.product]);
                            setOpen(false);
                          }}
                          className="text-[10px] text-[#45c4b0] hover:text-[#6ee7a0] transition-colors"
                        >
                          View Results
                        </button>
                      )}
                      {task.status !== 'running' && (
                        <button
                          onClick={() => dismissTask(task.id)}
                          className="text-[10px] text-[#5b6577] hover:text-[#9fb0c6] transition-colors"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
