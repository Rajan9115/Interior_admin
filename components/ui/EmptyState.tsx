import React from "react";
import Link from "next/link";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
  };
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  icon = <FolderOpen className="w-8 h-8 text-slate-400" />,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center rounded-xl border border-dashed border-slate-300 bg-white">
      <div className="p-3 bg-slate-50 border border-slate-100 rounded-full mb-3">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-[#172B40]">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#172B40] hover:bg-[#101E2E] rounded-lg shadow-xs transition-colors"
        >
          {action.icon}
          <span>{action.label}</span>
        </Link>
      )}
    </div>
  );
}

