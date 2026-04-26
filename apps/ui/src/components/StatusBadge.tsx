import React from 'react';
import { clsx } from 'clsx';
import { CheckCircle2, XCircle, Loader2, Gauge, Rocket } from 'lucide-react';

interface StatusBadgeProps {
  status: 'PENDING' | 'BUILDING' | 'DEPLOYING' | 'RUNNING' | 'FAILED';
}

const statusConfig = {
  PENDING: {
    label: 'Pending',
    icon: Gauge,
    className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  },
  BUILDING: {
    label: 'Building',
    icon: Loader2,
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse'
  },
  DEPLOYING: {
    label: 'Deploying',
    icon: Rocket,
    className: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  },
  RUNNING: {
    label: 'Running',
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  },
  FAILED: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-red-500/10 text-red-400 border-red-500/20'
  }
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <div className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors',
      config.className
    )}>
      <Icon className={clsx('w-3.5 h-3.5', status === 'BUILDING' && 'animate-spin')} />
      {config.label}
    </div>
  );
}
