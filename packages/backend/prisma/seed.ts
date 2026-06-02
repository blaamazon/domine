import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed marketplaces
  const marketplaces = [
    { name: 'Amazon KDP', code: 'amazon_kdp', configSchema: { type: 'object', properties: { apiKey: { type: 'string' } } } },
    { name: 'Etsy', code: 'etsy', configSchema: { type: 'object', properties: { apiKey: { type: 'string' }, shopId: { type: 'string' } } } },
    { name: 'Shopify', code: 'shopify', configSchema: { type: 'object', properties: { storeUrl: { type: 'string' }, accessToken: { type: 'string' } } } },
    { name: 'Gumroad', code: 'gumroad', configSchema: { type: 'object', properties: { accessToken: { type: 'string' } } } },
  ];

  for (const m of marketplaces) {
    await prisma.marketplace.upsert({
      where: { code: m.code },
      update: {},
      create: m,
    });
  }

  // Seed categories
  const categories = [
    { name: 'Fiction', slug: 'fiction', description: 'Fictional literature' },
    { name: 'Non-Fiction', slug: 'non-fiction', description: 'Non-fictional works' },
    { name: 'Classic Literature', slug: 'classic-literature', description: 'Classic literary works', parentSlug: 'fiction' },
    { name: 'Art & Photography', slug: 'art-photography', description: 'Art and photography collections' },
    { name: 'Sheet Music', slug: 'sheet-music', description: 'Musical scores and sheet music' },
    { name: 'Poetry', slug: 'poetry', description: 'Poetic works' },
    { name: 'Philosophy', slug: 'philosophy', description: 'Philosophical texts' },
    { name: 'Science & Nature', slug: 'science-nature', description: 'Scientific and natural history works' },
  ];

  for (const cat of categories) {
    const { parentSlug, ...data } = cat as any;
    let parentId: string | undefined;

    if (parentSlug) {
      const parent = await prisma.category.findUnique({ where: { slug: parentSlug } });
      if (parent) parentId = parent.id;
    }

    await prisma.category.upsert({
      where: { slug: data.slug },
      update: {},
      create: { ...data, parentId },
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });