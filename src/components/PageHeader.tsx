import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon: Icon }) => {
  const label = title.toUpperCase();

  return (
    <div className="relative mb-6 overflow-hidden rounded-[28px] border border-slate-800/50 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.28)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.24),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(129,140,248,0.18),transparent_34%)]" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="relative flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/90 backdrop-blur">
            {Icon && <Icon className="h-4 w-4" />}
            <span className="truncate">{label}</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-[2.35rem] md:leading-none">{title}</h1>
          {subtitle ? <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">{subtitle}</p> : null}
        </div>
        {Icon && (
          <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/10 text-white/90 backdrop-blur md:flex">
            <Icon className="h-7 w-7" />
          </div>
        )}
      </div>
    </div>
  );
};