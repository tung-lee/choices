import { Link, Outlet, useLocation } from 'react-router-dom'
import { WalletButton } from './WalletButton'

const navLinks = [
  { to: '/', label: 'Markets' },
  { to: '/create', label: 'Create' },
  { to: '/admin', label: 'Admin' },
]

export function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold text-white no-underline">
              Stellar Predictions
            </Link>
            <nav className="flex gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                    location.pathname === link.to
                      ? 'bg-surface-light text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <WalletButton />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
