import React from "react";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectForm } from "@/components/projects/ProjectForm";

export default async function NewProjectPage() {
  const categories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create New Project"
        description="Fill out the technical and visual details to create a new portfolio draft."
        backHref="/projects"
        backLabel="All Projects"
      />

      <ProjectForm categories={categories} />
    </div>
  );
}
