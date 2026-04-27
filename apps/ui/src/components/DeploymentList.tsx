import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { deploymentApi } from '../lib/api';
import { StatusBadge } from './StatusBadge';
import { LogViewer } from './LogViewer';
import { ExternalLink, Hash, Clock, Terminal } from 'lucide-react';

export function DeploymentList() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource('/api/deployments/stream');

    eventSource.onmessage = (event) => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    };

    return () => eventSource.close();
  }, [queryClient]);

  const { data, isLoading } = useQuery({
    queryKey: ['deployments', page],
    queryFn: () => deploymentApi.getAll(page, limit),
  });

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const deployments = data?.data || [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2 justify-center">
        <Clock className="w-5 h-5 text-primary" />
        Deployment History
      </h2>

      {deployments.length === 0 ? (
        <div className="p-16 glass rounded-2xl border-dashed border-2 border-zinc-800 text-center text-zinc-500">
          No deployments yet. Start by triggering one above!
        </div>
      ) : (
        <div className="grid gap-6">
          {deployments.map((d) => (
            <div key={d.id} className="p-5 glass rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 deploy-card group border-white/5 hover:bg-white/5 shadow-lg">
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-zinc-200 truncate max-w-[200px]" title={d.gitUrl}>
                    {d.gitUrl.split('/').pop()}
                  </span>
                  <StatusBadge status={d.status} />
                </div>

                <div className="flex flex-wrap items-center gap-4 text-zinc-500 text-[12px]">
                  <div className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="font-mono">{d.commitHash?.substring(0, 7) || 'latest'}</span>
                  </div>
                  {d.imageTag && (
                    <div className="bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 font-mono">
                      {d.imageTag}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedId(d.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors border border-zinc-700"
                >
                  <Terminal className="w-4 h-4" />
                  Logs
                </button>

                {d.status === 'RUNNING' && d.liveUrl && (
                  <a
                    href={d.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-sm transition-colors border border-primary/20"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Visit
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.total > limit && (
        <div className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-lg border border-border">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-zinc-800 disabled:opacity-50 rounded-md text-sm transition-colors hover:bg-zinc-700 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-zinc-500 text-sm font-medium">
            Page {page} of {Math.ceil(data.total / limit)}
          </span>
          <button
            onClick={() => setPage(p => Math.min(Math.ceil(data.total / limit), p + 1))}
            disabled={page >= Math.ceil(data.total / limit)}
            className="px-4 py-2 bg-zinc-800 disabled:opacity-50 rounded-md text-sm transition-colors hover:bg-zinc-700 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}

      {selectedId && (
        <LogViewer
          deploymentId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
