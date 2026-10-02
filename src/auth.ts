import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/server/db';
import { encrypt } from '@/server/crypto';

const base = PrismaAdapter(db);
export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: {
    ...base,
    async linkAccount(account) {
      await base.linkAccount!({ ...account,
        access_token: account.access_token ? encrypt(account.access_token) : undefined,
        refresh_token: account.refresh_token ? encrypt(account.refresh_token) : undefined,
        id_token: undefined,
      });
    },
  },
  session: { strategy: 'database' },
  pages: { signIn: '/', error: '/' },
  providers: [Google({
    clientId: process.env.AUTH_GOOGLE_ID || '', clientSecret: process.env.AUTH_GOOGLE_SECRET || '',
    authorization: { params: {
      scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
      access_type: 'offline', prompt: 'consent',
    } },
  })],
  callbacks: {
    session({ session, user }) { session.user.id = user.id; return session; },
  },
  events: {
    async signIn({ user, account }) {
      if (!user.id || account?.provider !== 'google') return;
      await db.account.updateMany({ where: { userId: user.id, provider: 'google', providerAccountId: account.providerAccountId }, data: {
        ...(account.access_token ? { access_token: encrypt(account.access_token) } : {}),
        ...(account.refresh_token ? { refresh_token: encrypt(account.refresh_token) } : {}),
        expires_at: account.expires_at, scope: account.scope, id_token: null,
      } });
      await db.user.update({ where: { id: user.id }, data: { driveStatus: 'CONNECTED' } });
    },
  },
});
