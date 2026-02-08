import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { WalletProvider } from './hooks/useWallet'
import { Layout } from './components/Layout'
import { Markets } from './pages/Markets'
import { CreateMarket } from './pages/CreateMarket'
import { MarketDetail } from './pages/MarketDetail'
import { Admin } from './pages/Admin'
import { Faucet } from './pages/Faucet'

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Markets />} />
            <Route path="/create" element={<CreateMarket />} />
            <Route path="/market/:id" element={<MarketDetail />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/faucet" element={<Faucet />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#111111',
            color: '#fff',
            border: '1px solid #222222',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
    </WalletProvider>
  )
}
