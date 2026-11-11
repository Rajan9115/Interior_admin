"use client";

import React, { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

interface AdminShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
}

export function AdminShell({
  children,
  userEmail,
  userName,
}: AdminShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area (Offset for desktop sidebar) */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <AdminHeader
          onMenuToggle={() => setIsSidebarOpen(true)}
          userEmail={userEmail}
          userName={userName}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

