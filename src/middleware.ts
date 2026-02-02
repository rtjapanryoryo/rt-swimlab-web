import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/api/auth/signin',
  },
});

export const config = {
  matcher: [
    /*
     * 以下を除外して保護:
     * - api（/api/auth/* は認証フロー用、/api/generate-menu は個別に401で保護）
     * - _next/static, _next/image
     * - favicon.ico 等の静的ファイル
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
