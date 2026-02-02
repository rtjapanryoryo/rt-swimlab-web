import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  // / のみ保護。/login と /api/* は除外
  matcher: ['/'],
};
