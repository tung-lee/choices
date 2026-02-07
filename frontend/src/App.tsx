import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { WalletProvider } from './hooks/useWallet'
import { Layout } from './components/Layout'
import { Markets } from './pages/Markets'
import { CreateMarket } from './pages/CreateMarket'
import { MarketDetail } from './pages/MarketDetail'
import { Admin } from './pages/Admin'

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
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e1e2e',
            color: '#fff',
            border: '1px solid #3a3a4e',
          },
        }}
      />
    </WalletProvider>
  )
}
