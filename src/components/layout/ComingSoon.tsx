import type { LucideIcon } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function ComingSoon({ title, description, icon: Icon }: ComingSoonProps) {
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-text">{title}</h1>

      <div className="mt-6 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface py-20 text-center">
        <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg text-label">
          <Icon size={20} aria-hidden="true" />
        </span>
        <p className="font-medium text-text">Coming soon</p>
        <p className="mt-1 max-w-[320px] text-sm text-text-secondary">{description}</p>
      </div>
    </div>
  );
}
