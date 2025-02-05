import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const WalletContext = createContext(null)

const WALLET_INIT_TIMEOUT = 3000; // 3 seconds timeout for wallet initialization

export const WalletProvider = ({ children }) => {
  const [address, setAddress] = useState(null)
  const [isConnecting, setIsConnecting] = useState(true) // Start as true until initial check
  const [error, setError] = useState(null)
  const [isReady, setIsReady] = useState(false)

  const checkConnection = useCallback(async () => {
    if (window.arweaveWallet) {
      try {
        const addr = await window.arweaveWallet.getActiveAddress()
        if (addr) {
          setAddress(addr)
        }
      } catch (err) {
        console.error('Error checking wallet connection:', err)
        setError('Failed to check wallet connection')
      } finally {
        setIsConnecting(false)
        setIsReady(true)
      }
    } else {
      setIsConnecting(false)
      setIsReady(true)
    }
  }, [])

  const connect = async () => {
    setIsConnecting(true)
    try {
      const addr = await window.arweaveWallet.getActiveAddress()
      setAddress(addr)
    } catch (err) {
      console.error('Error connecting wallet:', err)
      setError('Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    setAddress(null)
    setError(null)
  }

  useEffect(() => {
    // Initial connection check
    checkConnection()

    // Set a timeout to ensure we don't wait forever for wallet
    const timeoutId = setTimeout(() => {
      setIsConnecting(false)
      setIsReady(true)
    }, WALLET_INIT_TIMEOUT)

    // Listen for ArConnect wallet loading
    window.addEventListener('arweaveWalletLoaded', checkConnection)

    return () => {
      window.removeEventListener('arweaveWalletLoaded', checkConnection)
      clearTimeout(timeoutId)
    }
  }, [checkConnection])

  return (
    <WalletContext.Provider 
      value={{
        address,
        isConnecting,
        error,
        connect,
        disconnect,
        isConnected: !!address,
        isReady
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
