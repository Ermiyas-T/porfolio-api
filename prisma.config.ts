import { defineConfig } from 'prisma/config';

// Prisma 7: database connection URL lives here, not in schema.prisma
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
