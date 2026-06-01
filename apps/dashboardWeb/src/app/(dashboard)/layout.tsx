import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AeroLogo from '@/components/AeroLogo';

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
  // 🛡️ Server-Side Session Guard
  const cookieStore = await cookies();
  const token = cookieStore.get('aero_session')?.value;

  // 1. If cookie token is missing, redirect immediately
  if (!token) {
    redirect('/login');
  }

  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://aero-y6mm.onrender.com';
  try {
    // 2. Query a protected endpoint to verify token validity (expired / invalid check)
    const res = await fetch(`${baseURL}/projects`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      next: { revalidate: 0 } // Disable caching to fetch live token verification every load
    });

    if (res.status === 401) {
      // 3. Token is expired or unauthorized: redirect immediately
      redirect('/login');
    }
  } catch (error) {
    // Network fail/offline fallback (allow console rendering but log verification problem)
    console.error('Session verification network error:', error);
  }

  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          {/* Left Navigation Sidebar */}
          <aside className="sidebar">
            <div className="logo-container">
              <AeroLogo size={20} />
              <span className="logo-text">AERO CLOUD</span>
            </div>

            <nav className="nav-menu">
              <a href="#" className="nav-item active">
                <span>⚡</span>
                <span>Console Home</span>
              </a>
              <a href="#" className="nav-item">
                <span>🖥️</span>
                <span>My Nodes</span>
              </a>
              <a href="#" className="nav-item">
                <span>📦</span>
                <span>Services</span>
              </a>
              <a href="#" className="nav-item">
                <span>🛒</span>
                <span>Marketplace</span>
              </a>
              <a href="#" className="nav-item">
                <span>⚙️</span>
                <span>Settings</span>
              </a>
            </nav>
          </aside>

          {/* Main Content Workspace */}
          <div className="main-content">
            <header className="top-header">
              <div className="breadcrumb">
                Aero Console <span>/</span> <strong>Overview</strong>
              </div>
              <div className="profile-card">
                <span className="status-dot"></span>
                <span>Hardware Server (Active)</span>
              </div>
            </header>

            <main className="content-viewport">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
