import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  const user = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: passwordHash,
      role: 'admin'
    }
  });
  
  console.log('Admin user created:', user.username);
  await prisma.$disconnect();
}

createAdmin();
