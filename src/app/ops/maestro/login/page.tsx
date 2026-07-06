/**
 * Login page for Maestro admin panel
 * Public route - no authentication required
 */

import { Metadata } from 'next';
import LoginForm from './login-form';

export const metadata: Metadata = {
  title: 'Login - Maestro Admin',
  description: 'Admin login for email management system',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <LoginForm />
    </div>
  );
}
