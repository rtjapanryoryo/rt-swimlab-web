import { getAuthConfiguredServer } from '@/lib/auth-config';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const authConfigured = getAuthConfiguredServer();
  return <LoginForm authConfigured={authConfigured} />;
}
