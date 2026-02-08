import bcrypt from 'bcrypt';
import { db } from '../../config/database.js';
import { users } from '../../db/schema/users.js';

const DEFAULT_PASSWORD = 'Test123123!';
const SALT_ROUNDS = 10;

interface SeededUser {
  id: string;
  email: string;
  role: string;
}

export async function seedUsers(): Promise<SeededUser[]> {
  console.log('  Seeding users...');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  const usersData = [
    {
      email: 'owner@sanpablo.com',
      fullName: 'Owner San Pablo',
      role: 'owner',
      passwordHash,
    },
    {
      email: 'admin@sanpablo.com',
      fullName: 'Admin San Pablo',
      role: 'admin',
      passwordHash,
    },
    {
      email: 'comprador1@test.com',
      fullName: 'Juan Comprador',
      role: 'buyer',
      passwordHash,
    },
    {
      email: 'comprador2@test.com',
      fullName: 'María Compradora',
      role: 'buyer',
      passwordHash,
    },
    {
      email: 'partner@test.com',
      fullName: 'Socio Comercial',
      role: 'partner',
      passwordHash,
    },
  ];

  const createdUsers: SeededUser[] = [];

  for (const userData of usersData) {
    const [created] = await db
      .insert(users)
      .values(userData)
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id, email: users.email, role: users.role });

    if (created) {
      createdUsers.push(created);
      console.log(`    + User: ${created.email} (${created.role})`);
    } else {
      console.log(`    ~ User already exists: ${userData.email}`);
    }
  }

  console.log(`  Users seeded: ${createdUsers.length} created`);
  return createdUsers;
}
