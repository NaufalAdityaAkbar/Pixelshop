import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Securely log DB connectivity presence on module load
if (typeof process !== 'undefined' && process.env) {
  const dbUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;
  console.log(`[PRISMA STARTUP] Database Config Check: DATABASE_URL is ${dbUrl ? 'DETECTED' : 'MISSING (Check your environment variables)'}, DIRECT_URL is ${directUrl ? 'DETECTED' : 'MISSING'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`[PRISMA STARTUP] Detected NODE_ENV=production, running in production mode.`);
  }
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
