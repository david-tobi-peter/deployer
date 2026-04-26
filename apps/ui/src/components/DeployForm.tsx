import React, { useState } from 'react';
import { deploymentApi } from '../lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GitBranch, GitPullRequest, Send, Loader2 } from 'lucide-react';

export function DeployForm() {
  const [gitUrl, setGitUrl] = useState('');
  const [commitHash, setCommitHash] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deploymentApi.create(gitUrl, commitHash || undefined),
    onSuccess: () => {
      setGitUrl('');
      setCommitHash('');
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitUrl) return;
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 glass rounded-2xl space-y-8 shadow-2xl border border-white/5">
      <div className="space-y-3">
        <label className="text-sm font-semibold text-zinc-400 flex items-center gap-2 px-1">
          <GitBranch className="w-4 h-4 text-primary" />
          Git Repository URL
        </label>
        <input
          type="text"
          value={gitUrl}
          onChange={(e) => setGitUrl(e.target.value)}
          placeholder="https://github.com/username/repo"
          className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-zinc-700"
          required
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-semibold text-zinc-400 flex items-center gap-2 px-1">
          <GitPullRequest className="w-4 h-4 text-primary" />
          Commit Hash or Ref (Optional)
        </label>
        <input
          type="text"
          value={commitHash}
          onChange={(e) => setCommitHash(e.target.value)}
          placeholder="main, v1.0.0, or specific hash"
          className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-zinc-700"
        />
      </div>

      <button
        type="submit"
        disabled={mutation.isPending || !gitUrl}
        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-md flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
      >
        {mutation.isPending ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
        {mutation.isPending ? 'Deploying...' : 'Deploy Now'}
      </button>

      {mutation.isError && (
        <p className="text-xs text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">
          {(mutation.error as any)?.response?.data?.error?.message || 'Failed to trigger deployment'}
        </p>
      )}
    </form>
  );
}
