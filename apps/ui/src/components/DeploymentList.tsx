import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deploymentApi, Deployment } from '../lib/api';
import { StatusBadge } from './StatusBadge';
import { LogViewer } from './LogViewer';
import { ExternalLink, Hash, Clock, Terminal } from 'lucide-react';

export function DeploymentList() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['deployments'],
    queryFn: deploymentApi.getAll,
    refetchInterval: 5000, // Poll every 5s for status updates
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

      {selectedId && (
        <LogViewer
          deploymentId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
