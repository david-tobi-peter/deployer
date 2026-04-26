import React, { useEffect, useRef, useState } from 'react';
import { Terminal, X, Circle, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface LogViewerProps {
  deploymentId: string;
  onClose: () => void;
}

export function LogViewer({ deploymentId, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'streaming' | 'done' | 'error'>('streaming');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/deployments/${deploymentId}/logs`);

    eventSource.onmessage = (event) => {
      setLogs((prev) => [...prev, event.data]);
    };

    eventSource.addEventListener('done', (event: any) => {
      setLogs((prev) => [...prev, `\n✅ Deployment successful! Live at: ${event.data}`]);
      setStatus('done');
      eventSource.close();
    });

    eventSource.addEventListener('error', (event: any) => {
      setLogs((prev) => [...prev, `\n❌ Error: ${event.data || 'Connection lost'}`]);
      setStatus('error');
      eventSource.close();
    });

    return () => {
      eventSource.close();
    };
  }, [deploymentId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-full max-h-[80vh] glass rounded-xl flex flex-col shadow-2xl overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-border">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-zinc-400" />
            <span className="text-sm font-semibold">Deployment Logs</span>
            <div className="flex items-center gap-1.5 ml-4">
              <div className={clsx(
                'w-2 h-2 rounded-full',
                status === 'streaming' && 'bg-blue-500 animate-pulse',
                status === 'done' && 'bg-emerald-500',
                status === 'error' && 'bg-red-500'
              )} />
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                {status}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Console */}
        <div
          ref={scrollRef}
          className="flex-1 p-4 font-mono text-xs sm:text-sm overflow-y-auto bg-black/40 space-y-1"
        >
          {logs.map((log, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-zinc-700 select-none w-4">{i + 1}</span>
              <span className={clsx(
                'break-all',
                log.startsWith('✅') ? 'text-emerald-400 font-bold' :
                  log.startsWith('❌') ? 'text-red-400 font-bold' : 'text-zinc-300'
              )}>
                {log}
              </span>
            </div>
          ))}
          {status === 'streaming' && (
            <div className="flex items-center gap-2 text-zinc-600 animate-pulse">
              <Circle className="w-2 h-2 fill-current" />
              <span>Waiting for logs...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
