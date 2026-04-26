import React from 'react';
import { DeployForm } from './components/DeployForm';
import { DeploymentList } from './components/DeploymentList';
import { Rocket, ShieldCheck, Zap } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-purple-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-16 sm:px-6 space-y-16 flex flex-col items-center">
        {/* Header */}
        <header className="text-center space-y-6">
          <div className="flex flex-col items-center space-y-3">
            <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20 inline-block">
              <Rocket className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight gradient-text">
              Deployer
            </h1>
            <p className="text-zinc-500 text-lg font-medium max-w-md mx-auto">
              Enterprise-grade container orchestration at your fingertips.
            </p>
          </div>

          <div className="flex items-center justify-center gap-6 text-[11px] font-bold uppercase tracking-widest text-zinc-600">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Deterministic
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-500" />
              Railpack
            </div>
          </div>
        </header>

        <main className="w-full space-y-12">
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 px-1 justify-center">
              New Deployment
            </h2>
            <DeployForm />
          </section>

          <section className="space-y-6">
            <DeploymentList />
          </section>
        </main>

        <footer className="pt-12 border-t border-border/50 text-center text-xs text-zinc-600">
          <p>© 2026 Deployer. Powered by BuildKit & Railpack.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
