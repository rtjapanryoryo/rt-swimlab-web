import { getAuthConfiguredServer } from '@/lib/auth-config';
import { SignupForm } from './SignupForm';

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  const authConfigured = getAuthConfiguredServer();
  return <SignupForm authConfigured={authConfigured} />;
}
