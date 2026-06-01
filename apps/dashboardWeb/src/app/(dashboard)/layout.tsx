import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aero Cloud Console',
  description: 'Self-hosted cloud management and deployment console.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          {/* Left Navigation Sidebar */}
          <aside className="sidebar">
            <div className="logo-container">
              <span className="logo-icon">▲</span>
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
