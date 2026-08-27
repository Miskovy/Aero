import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayoutWrapper from '@/components/DashboardLayoutWrapper';
import { authService } from '@/services/api/auth.service';
export const metadata: Metadata = {
  title: 'Aero Cloud Console',
  description: 'Self-hosted cloud management and deployment console.',
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  }
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('aero_session')?.value;

  if (!token) {
    redirect('/login');
  }

  let isValid = false;
  try {
    const res = await authService.validateToken(token);
    isValid = Boolean(res?.is_valid);
  } catch (error) {
    console.error('Session verification network error:', error);
    isValid = false;
  }

  if (!isValid) {
    redirect('/login');
  }

  return (
    <>
      <DashboardLayoutWrapper>
        {children}
      </DashboardLayoutWrapper>
    </>
  );
}
