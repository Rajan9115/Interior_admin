import React from "react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { AdminShell } from "@/components/layout/AdminShell";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireAdmin();

  if (!context) {
    redirect("/login");
  }

  return (
    <AdminShell
      userEmail={context.adminUser.email}
      userName={context.adminUser.displayName}
    >
      {children}
    </AdminShell>
  );
}
