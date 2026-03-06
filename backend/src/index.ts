import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { prisma } from './db';

const PORT = process.env.PORT ?? 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown — close DB connection cleanly on exit.
async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
