'use client';

import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from 'react';
import type { BackgroundTask, ProductId, TaskType, TaskStatus, TaskExecutorCallbacks } from './types';

type TaskExecutor<TResult> = (callbacks: TaskExecutorCallbacks) => Promise<TResult>;

interface BackgroundTaskContextValue {
  tasks: BackgroundTask[];
  startTask: <TResult>(params: {
    product: ProductId;
    type: TaskType;
    label: string;
    request: Record<string, unknown>;
    executor: TaskExecutor<TResult>;
  }) => string;
  getLatestResult: <TResult>(product: ProductId, type: TaskType) => TResult | null;
  getRunningTask: (product: ProductId, type: TaskType) => BackgroundTask | null;
  dismissTask: (id: string) => void;
  clearCompleted: () => void;
}

const BackgroundTaskContext = createContext<BackgroundTaskContextValue | null>(null);

export function useBackgroundTaskContext() {
  const ctx = useContext(BackgroundTaskContext);
  if (!ctx) throw new Error('useBackgroundTaskContext must be used within BackgroundTaskProvider');
  return ctx;
}

let nextId = 1;

export function BackgroundTaskProvider({ children }: { children: ReactNode }) {
  const tasksRef = useRef<Map<string, BackgroundTask>>(new Map());
  const [, setVersion] = useState(0);
  const rafRef = useRef<number | null>(null);

  const bump = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setVersion(v => v + 1);
    });
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<BackgroundTask>) => {
    const task = tasksRef.current.get(id);
    if (!task) return;
    Object.assign(task, patch);
    bump();
  }, [bump]);

  const startTask = useCallback(<TResult,>(params: {
    product: ProductId;
    type: TaskType;
    label: string;
    request: Record<string, unknown>;
    executor: TaskExecutor<TResult>;
  }): string => {
    // Supersede any existing running task of the same product+type
    Array.from(tasksRef.current.values()).forEach(task => {
      if (task.product === params.product && task.type === params.type && task.status === 'running') {
        task.status = 'superseded' as TaskStatus;
        task.completedAt = Date.now();
      }
    });

    const id = `task-${nextId++}-${Date.now()}`;
    const abortedRef = { current: false };

    const task: BackgroundTask<TResult> = {
      id,
      type: params.type,
      product: params.product,
      label: params.label,
      status: 'running',
      progress: 0,
      progressLabel: 'Starting...',
      startedAt: Date.now(),
      completedAt: null,
      error: null,
      request: params.request,
      result: null,
    };

    tasksRef.current.set(id, task as BackgroundTask);
    bump();

    const callbacks: TaskExecutorCallbacks = {
      setProgress: (pct: number, label?: string) => {
        updateTask(id, {
          progress: Math.min(100, Math.max(0, pct)),
          ...(label !== undefined ? { progressLabel: label } : {}),
        });
      },
      checkAborted: () => {
        if (abortedRef.current) throw new Error('Task aborted');
        // Also check if superseded
        const t = tasksRef.current.get(id);
        if (t && t.status === 'superseded') throw new Error('Task superseded');
      },
    };

    // Run the executor — the Promise lives in closure, survives unmounts
    params.executor(callbacks)
      .then((result) => {
        const t = tasksRef.current.get(id);
        if (t && t.status === 'running') {
          updateTask(id, {
            status: 'completed',
            progress: 100,
            progressLabel: 'Complete',
            completedAt: Date.now(),
            result: result as unknown,
          });
        }
      })
      .catch((err) => {
        const t = tasksRef.current.get(id);
        if (t && t.status === 'running') {
          updateTask(id, {
            status: 'failed',
            completedAt: Date.now(),
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });

    return id;
  }, [bump, updateTask]);

  const getLatestResult = useCallback(<TResult,>(product: ProductId, type: TaskType): TResult | null => {
    let latestResult: unknown = null;
    let latestTime = -1;
    Array.from(tasksRef.current.values()).forEach(task => {
      if (task.product === product && task.type === type && task.status === 'completed' && task.result !== null) {
        if (task.completedAt! > latestTime) {
          latestTime = task.completedAt!;
          latestResult = task.result;
        }
      }
    });
    return latestResult as TResult | null;
  }, []);

  const getRunningTask = useCallback((product: ProductId, type: TaskType): BackgroundTask | null => {
    const tasks = Array.from(tasksRef.current.values());
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].product === product && tasks[i].type === type && tasks[i].status === 'running') {
        return tasks[i];
      }
    }
    return null;
  }, []);

  const dismissTask = useCallback((id: string) => {
    tasksRef.current.delete(id);
    bump();
  }, [bump]);

  const clearCompleted = useCallback(() => {
    Array.from(tasksRef.current.entries()).forEach(([id, task]) => {
      if (task.status !== 'running') {
        tasksRef.current.delete(id);
      }
    });
    bump();
  }, [bump]);

  const tasks = Array.from(tasksRef.current.values());

  return (
    <BackgroundTaskContext.Provider value={{ tasks, startTask, getLatestResult, getRunningTask, dismissTask, clearCompleted }}>
      {children}
    </BackgroundTaskContext.Provider>
  );
}
