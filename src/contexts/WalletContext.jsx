import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const WalletContext = createContext(null)

export const WalletProvider = ({ children }) => {
  const [address, setAddress] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)

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
      }
    }
  }, [])

  const connect = async () => {
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
    checkConnection()

    // Listen for ArConnect wallet loading
    window.addEventListener('arweaveWalletLoaded', checkConnection)

    return () => {
      window.removeEventListener('arweaveWalletLoaded', checkConnection)
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
        isConnected: !!address
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
