import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayoutWrapper from '@/components/DashboardLayoutWrapper';

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

  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://aero-y6mm.onrender.com';
  try {
    const res = await fetch(`${baseURL}/projects`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      next: { revalidate: 0 }
    });

    if (res.status === 401) {
      redirect('/login');
    }
  } catch (error) {
    console.error('Session verification network error:', error);
  }

  return (
    <>
      <DashboardLayoutWrapper>
        {children}
      </DashboardLayoutWrapper>
    </>
  );
}
