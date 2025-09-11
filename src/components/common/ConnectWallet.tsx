import React from 'react'
import { useWallet } from '../../contexts/WalletContext'
import './ConnectWallet.css'

interface ConnectWalletProps {
  oneWayOnly?: boolean
}

export const ConnectWallet = ({ oneWayOnly = false }: ConnectWalletProps) => {
  const walletContext = useWallet() as any // Type assertion to work with untyped context
  const { address, isConnected, isConnecting } = walletContext

  const handleConnect = async () => {
    try {
      if (!window.arweaveWallet) {
        alert('Please install ArConnect to continue')
        window.open('https://arconnect.io', '_blank')
        return
      }

      await window.arweaveWallet.connect([
        'ACCESS_ADDRESS',
        'SIGN_TRANSACTION',
        'DISPATCH'
      ])
      
      if (walletContext.connect) {
        await walletContext.connect()
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      alert('Failed to connect wallet. Please try again.')
    }
  }

  const handleDisconnect = async () => {
    try {
      await window.arweaveWallet.disconnect()
      if (walletContext.disconnect) {
        walletContext.disconnect()
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
    }
  }

  const formatAddress = (addr) => {
    if (!addr) return ''
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
  }

  // If one-way only and already connected, don't show anything
  if (oneWayOnly && isConnected) {
    return null
  }

  return (
    <div className="wallet-container">
      <button 
        className="connect-wallet" 
        onClick={oneWayOnly ? handleConnect : (isConnected ? handleDisconnect : handleConnect)}
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting...' : 
         (oneWayOnly || !isConnected) ? 'Connect Wallet' :
         formatAddress(address)}
      </button>
    </div>
  )
}
