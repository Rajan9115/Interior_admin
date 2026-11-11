"use client";

import React, { useState } from "react";
import { Menu, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";

interface AdminHeaderProps {
  onMenuToggle: () => void;
  userEmail?: string;
  userName?: string;
}

export function AdminHeader({
  onMenuToggle,
  userEmail = "owner@mamainterior.in",
  userName = "MAMA INTERIOR Owner",
}: AdminHeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch("/api/v1/auth/logout", {
        method: "POST",
      });
      router.push("/login");
      router.refresh();
    } catch {
      // Force redirect on failure
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      {/* Mobile Hamburger Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-[#172B40] hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
          Contractor Content Hub
        </span>
      </div>

      {/* Owner Info & Actions */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
          <div className="w-7 h-7 rounded-full bg-[#172B40] text-white flex items-center justify-center">
            <User className="w-4 h-4 text-[#B58A58]" />
          </div>
          <div className="hidden sm:block text-left">
            <span className="block text-xs font-semibold text-[#172B40] leading-tight">
              {userName}
            </span>
            <span className="block text-[11px] text-slate-500 leading-tight">
              {userEmail}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all disabled:opacity-50"
          title="Sign out of Admin CMS"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
