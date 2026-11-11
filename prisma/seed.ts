import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const initialCategories = [
  {
    name: "Electrical Installation & Wiring",
    slug: "electrical",
    description:
      "Residential and commercial electrification, concealed house wiring, distribution board balancing, safety breakers, and architectural illumination.",
    sortOrder: 0,
    isActive: true,
  },
  {
    name: "Carpentry & Custom Woodwork",
    slug: "carpentry",
    description:
      "Bespoke modular kitchens, custom wardrobes, TV entertainment units, and handcrafted architectural joinery.",
    sortOrder: 1,
    isActive: true,
  },
  {
    name: "Painting & Surface Finishes",
    slug: "painting",
    description:
      "Flawless interior wall finishes, designer accent textures, anti-fungal primers, and rich wood polish.",
    sortOrder: 2,
    isActive: true,
  },
  {
    name: "False Ceiling & POP Solutions",
    slug: "ceiling",
    description:
      "Modern false ceiling designs featuring seamless gypsum boards, POP detailing, ambient cove lighting, and acoustic insulation.",
    sortOrder: 3,
    isActive: true,
  },
];

async function main() {
  console.log("Starting MAMA INTERIOR database seed...");

  for (const cat of initialCategories) {
    const category = await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
      },
    });
    console.log(`✓ Seeded category: ${category.name} (${category.slug})`);
  }

  console.log("Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

