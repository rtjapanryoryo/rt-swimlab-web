import { getAuthConfiguredServer } from '@/lib/auth-config';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const authConfigured = getAuthConfiguredServer();
  const devBypassEnabled =
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' &&
    !!process.env.NEXT_PUBLIC_DEV_BYPASS_USER_ID;
  return <LoginForm authConfigured={authConfigured} devBypassEnabled={devBypassEnabled} />;
}
