import React from "react";

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
      <div className="h-12 bg-slate-50 animate-pulse" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-slate-200 rounded-lg shrink-0" />
            <div className="space-y-2 flex-1 max-w-md">
              <div className="h-4 bg-slate-200 rounded-md w-3/4" />
              <div className="h-3 bg-slate-100 rounded-md w-1/2" />
            </div>
          </div>
          <div className="h-6 w-20 bg-slate-200 rounded-full" />
          <div className="h-8 w-16 bg-slate-100 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl bg-white p-6 rounded-xl border border-slate-200 animate-pulse">
      <div className="h-6 bg-slate-200 rounded w-1/4" />
      <div className="space-y-4">
        <div className="h-10 bg-slate-100 rounded" />
        <div className="h-10 bg-slate-100 rounded" />
        <div className="h-28 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

