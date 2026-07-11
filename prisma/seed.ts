import { PrismaClient, PostStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Seed the admin user — change email/password in .env or re-run after setup
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'changeme_32chars!!';

async function main() {
  // hash before persisting, never store plaintext
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await prisma.adminUser.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: { email: ADMIN_EMAIL, password: hash },
  });
  console.log(`Admin user seeded: ${ADMIN_EMAIL}`);

  // Seed sample published posts (migrate your existing hardcoded posts here)
  const samplePosts = [
    {
      slug: 'hello-world',
      title: 'Hello World',
      description: 'My first blog post on this portfolio.',
      content: `# Hello World\n\nWelcome to my blog. This is a sample post seeded from the migration script.\n\nMore content coming soon!`,
      category: 'General',
      tags: ['intro', 'hello'],
      featured: true,
      status: PostStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  ];

  for (const post of samplePosts) {
    const wordCount = post.content.trim().split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {},
      create: { ...post, readingTime },
    });
    console.log(`Post seeded: ${post.slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
