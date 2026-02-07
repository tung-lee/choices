import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  type ISupportedWallet,
} from '@creit.tech/stellar-wallets-kit'
import { NETWORK_PASSPHRASE } from '../lib/stellar'

interface WalletContextType {
  address: string | null
  connected: boolean
  connecting: boolean
  walletName: string | null
  connect: () => Promise<void>
  disconnect: () => void
  signTransaction: (xdr: string) => Promise<string>
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  connected: false,
  connecting: false,
  walletName: null,
  connect: async () => {},
  disconnect: () => {},
  signTransaction: async () => '',
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [walletName, setWalletName] = useState<string | null>(null)
  const kitRef = useRef<StellarWalletsKit | null>(null)

  useEffect(() => {
    const kit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      modules: allowAllModules(),
    })
    kitRef.current = kit
  }, [])

  const connect = useCallback(async () => {
    const kit = kitRef.current
    if (!kit) return

    setConnecting(true)
    try {
      await kit.openModal({
        onWalletSelected: async (option: ISupportedWallet) => {
          try {
            kit.setWallet(option.id)
            const { address: addr } = await kit.getAddress()
            setAddress(addr)
            setWalletName(option.name)
          } catch (err) {
            setConnecting(false)
            throw err
          }
          setConnecting(false)
        },
        onClosed: () => {
          setConnecting(false)
        },
        modalTitle: 'Connect Wallet',
        notAvailableText: 'Not installed',
      })
    } catch {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    const kit = kitRef.current
    if (kit) {
      try {
        await kit.disconnect()
      } catch {
        // Some modules may not implement disconnect
      }
    }
    setAddress(null)
    setWalletName(null)
  }, [])

  const signTransaction = useCallback(
    async (xdr: string) => {
      const kit = kitRef.current
      if (!kit) throw new Error('Wallet kit not initialized')
      const { signedTxXdr } = await kit.signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address: address ?? undefined,
      })
      return signedTxXdr
    },
    [address],
  )

  return (
    <WalletContext.Provider
      value={{
        address,
        connected: !!address,
        connecting,
        walletName,
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
