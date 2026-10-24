'use client';

import { useCallback } from 'react';
import { useBackgroundTaskContext } from './BackgroundTaskContext';
import type { ProductId, TaskType, TaskExecutorCallbacks } from './types';

export function useBackgroundTask<TResult>(product: ProductId, type: TaskType) {
  const ctx = useBackgroundTaskContext();

  const start = useCallback((
    label: string,
    request: Record<string, unknown>,
    executor: (callbacks: TaskExecutorCallbacks) => Promise<TResult>,
  ): string => {
    return ctx.startTask<TResult>({ product, type, label, request, executor });
  }, [ctx, product, type]);

  const latestResult = ctx.getLatestResult<TResult>(product, type);
  const runningTask = ctx.getRunningTask(product, type);
  const isRunning = runningTask !== null;

  return { start, latestResult, runningTask, isRunning };
}
