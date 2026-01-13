import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './db';

/**
 * Get the current authenticated user, or a demo user in development mode.
 * Returns null if no user is available.
 */
export async function getCurrentUser(): Promise<{ id: string; email: string; name: string | null } | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (session?.user) {
      const userId = (session.user as { id: string }).id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      });
      return user;
    }
    
    // In development, use demo user if no session
    if (process.env.NODE_ENV === 'development') {
      const demoUser = await prisma.user.findFirst({
        where: { email: 'admin@example.com' },
        select: { id: true, email: true, name: true },
      });
      return demoUser;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get the current user ID, throwing an error if not authenticated.
 */
export async function requireUser(): Promise<{ id: string; email: string; name: string | null }> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}
