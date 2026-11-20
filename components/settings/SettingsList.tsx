"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/** iOS-style grouped list: rows separated by hairlines inside one card. */
export function SettingsGroup({
  title,
  footer,
  children,
  className,
}: {
  title?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {title && <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">{title}</h2>}
      <div className="overflow-hidden rounded-[1.5rem] bg-card shadow-card [&>*+*]:border-t [&>*+*]:border-border">{children}</div>
      {footer && <p className="mt-2 px-1 text-sm text-muted-foreground">{footer}</p>}
    </section>
  );
}

function RowIcon({ icon: Icon }: { icon?: React.ComponentType<{ size?: number }> }) {
  if (!Icon) return null;
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
      <Icon size={18} />
    </span>
  );
}

export function SettingsRow({
  href,
  onClick,
  icon,
  label,
  hint,
  value,
  tone,
  chevron = true,
}: {
  href?: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ size?: number }>;
  label: string;
  hint?: React.ReactNode;
  value?: React.ReactNode;
  tone?: "danger";
  chevron?: boolean;
}) {
  const content = (
    <>
      <RowIcon icon={icon} />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[0.98rem] font-medium", tone === "danger" && "text-red-400")}>{label}</span>
        {hint && <span className="block truncate text-sm text-muted-foreground">{hint}</span>}
      </span>
      {value !== undefined && <span className="max-w-[45%] shrink-0 truncate text-[0.95rem] text-muted-foreground">{value}</span>}
      {chevron && (href || onClick) && <ChevronRight size={18} className="shrink-0 text-muted-foreground/70" />}
    </>
  );
  const cls = "flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-foreground/[0.03] active:bg-foreground/[0.05]";
  if (href) {
    return (
      <Link href={href} prefetch className={cls}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {content}
      </button>
    );
  }
  return <div className={cls}>{content}</div>;
}

export function SettingsToggle({
  icon,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  icon?: React.ComponentType<{ size?: number }>;
  label: string;
  hint?: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex min-h-14 items-center gap-3 px-4 py-2.5", disabled && "opacity-50")}>
      <RowIcon icon={icon} />
      <span className="min-w-0 flex-1">
        <span className="block text-[0.98rem] font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} label={label} />
    </div>
  );
}
