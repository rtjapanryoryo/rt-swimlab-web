import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const clientId = (process.env.GOOGLE_CLIENT_ID ?? '').trim().replace(/\r/g, '');
const clientSecret = (process.env.GOOGLE_CLIENT_SECRET ?? '').trim().replace(/\r/g, '');

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: clientId || 'placeholder',
      clientSecret: clientSecret || 'placeholder',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {},
  pages: {
    signIn: '/login',
    error: '/login',
  },
};
