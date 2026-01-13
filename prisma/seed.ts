import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create sample study
  const study = await prisma.study.upsert({
    where: { slug: 'product-features-demo' },
    update: {},
    create: {
      name: 'Product Feature Organization',
      description: 'Help us understand how users mentally organize product features.',
      slug: 'product-features-demo',
      mode: 'OPEN',
      status: 'ACTIVE',
      ownerId: admin.id,
      allowUndo: true,
      showProgress: true,
      requireAllCardsSorted: false,
      randomizeCards: true,
      instructions: 'Please sort these product features into groups that make sense to you. Create as many categories as you need.',
      thankYouMessage: 'Thank you for participating! Your responses help us improve our product.',
      cards: {
        create: [
          { label: 'Budget Planning', description: 'Create and manage budgets', sortOrder: 0 },
          { label: 'Invoice Generation', description: 'Generate and send invoices', sortOrder: 1 },
          { label: 'Team Chat', description: 'Real-time messaging with team', sortOrder: 2 },
          { label: 'Video Calls', description: 'Host and join video meetings', sortOrder: 3 },
          { label: 'Task Assignment', description: 'Assign tasks to team members', sortOrder: 4 },
          { label: 'Progress Tracking', description: 'Monitor project progress', sortOrder: 5 },
          { label: 'File Storage', description: 'Store and organize files', sortOrder: 6 },
          { label: 'Calendar', description: 'Schedule and manage events', sortOrder: 7 },
          { label: 'Expense Reports', description: 'Track and submit expenses', sortOrder: 8 },
          { label: 'Client Portal', description: 'Client-facing dashboard', sortOrder: 9 },
          { label: 'Analytics Dashboard', description: 'View business metrics', sortOrder: 10 },
          { label: 'Email Integration', description: 'Connect email accounts', sortOrder: 11 },
        ],
      },
    },
  });

  console.log('✅ Created sample study:', study.name);

  // Create sample closed study
  const closedStudy = await prisma.study.upsert({
    where: { slug: 'navigation-menu-demo' },
    update: {},
    create: {
      name: 'Navigation Menu Study',
      description: 'Help us organize our navigation menu.',
      slug: 'navigation-menu-demo',
      mode: 'CLOSED',
      status: 'ACTIVE',
      ownerId: admin.id,
      allowUndo: true,
      showProgress: true,
      requireAllCardsSorted: true,
      randomizeCards: true,
      cards: {
        create: [
          { label: 'My Account', description: 'View and edit profile', sortOrder: 0 },
          { label: 'Billing', description: 'Manage payment methods', sortOrder: 1 },
          { label: 'Team Members', description: 'Add or remove users', sortOrder: 2 },
          { label: 'Notifications', description: 'Email and push settings', sortOrder: 3 },
          { label: 'Security', description: '2FA and password', sortOrder: 4 },
          { label: 'Integrations', description: 'Connect third-party apps', sortOrder: 5 },
          { label: 'API Keys', description: 'Manage API access', sortOrder: 6 },
          { label: 'Audit Log', description: 'View activity history', sortOrder: 7 },
        ],
      },
      categories: {
        create: [
          { name: 'Account', sortOrder: 0 },
          { name: 'Team', sortOrder: 1 },
          { name: 'Settings', sortOrder: 2 },
          { name: 'Developer', sortOrder: 3 },
        ],
      },
    },
  });

  console.log('✅ Created closed study:', closedStudy.name);

  console.log('');
  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('You can now sign in with:');
  console.log('  Email: admin@example.com');
  console.log('  Password: admin123');
  console.log('');
  console.log('Sample studies:');
  console.log(`  Open sort: /s/${study.slug}`);
  console.log(`  Closed sort: /s/${closedStudy.slug}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
