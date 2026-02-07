import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import freighter from '@stellar/freighter-api'
import { NETWORK_PASSPHRASE } from '../lib/stellar'

interface WalletContextType {
  address: string | null
  connected: boolean
  connecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  signTransaction: (xdr: string) => Promise<string>
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  connected: false,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
  signTransaction: async () => '',
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    // Try to restore previous connection
    ;(async () => {
      try {
        const connected = await freighter.isConnected()
        if (connected) {
          const allowed = await freighter.isAllowed()
          if (allowed) {
            const { address } = await freighter.getAddress()
            setAddress(address)
          }
        }
      } catch {
        // Freighter not installed
      }
    })()
  }, [])

  const connect = useCallback(async () => {
    setConnecting(true)
    try {
      const connected = await freighter.isConnected()
      if (!connected) {
        throw new Error('Freighter wallet extension not installed')
      }
      await freighter.setAllowed()
      const { address } = await freighter.getAddress()
      setAddress(address)
    } catch (err) {
      throw err
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
  }, [])

  const signTransaction = useCallback(async (xdr: string) => {
    const { signedTxXdr } = await freighter.signTransaction(xdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
    })
    return signedTxXdr
  }, [])

  return (
    <WalletContext.Provider
      value={{
        address,
        connected: !!address,
        connecting,
        connect,
        disconnect,
        signTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
