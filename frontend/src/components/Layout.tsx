import { Link, Outlet, useLocation } from 'react-router-dom'
import { WalletButton } from './WalletButton'
import { TickerBar } from './TickerBar'

const navLinks = [
  { to: '/', label: 'Markets' },
  { to: '/create', label: 'Create' },
  { to: '/admin', label: 'Admin' },
  { to: '/faucet', label: 'Faucet' },
]

export function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Ticker Bar */}
      <TickerBar />

      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-black/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-8 lg:px-12 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 no-underline shrink-0">
              <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
                <span className="text-black font-bold text-sm">C</span>
              </div>
              <span className="text-white font-bold text-lg hidden sm:block">
                Choices
              </span>
            </Link>

            <nav className="flex items-center gap-1.5">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-4 py-2 rounded-lg text-sm font-medium no-underline transition-colors ${
                      isActive
                        ? 'bg-accent text-black'
                        : 'text-text-secondary hover:text-white hover:bg-surface'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="hidden md:flex items-center bg-surface border border-border-light rounded-lg px-4 py-2 gap-2.5 w-60">
              <svg className="w-4 h-4 text-text-dim shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-sm text-text-dim">Search Markets</span>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-8 lg:px-12 py-10">
        <Outlet />
      </main>
    </div>
  )
}
