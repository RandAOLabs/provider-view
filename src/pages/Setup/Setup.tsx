import React, { useState, useEffect } from 'react'

import { Spinner } from '../../components/common/Spinner'
import { useWallet } from '../../contexts/WalletContext'
import { useProviders } from '../../contexts/ProviderContext'
import PreliminaryCheck from '../../components/setup/PreliminaryCheck'
import './Setup.css'
import { CreateProvider } from '../../components/setup/CreateProvider'

type SetupMode = 'preliminary_check' | 'device_setup'


export default function Setup() {
  const { address: walletAddress } = useWallet()
  const { providers, currentProvider, refreshProviders, loading } = useProviders()
  const [setupMode, setSetupMode] = useState<SetupMode>('preliminary_check')
  const [addressCopied, setAddressCopied] = useState(false)
  const [walletBalance, setWalletBalance] = useState<string | null>(null)

  // Always start with preliminary check
  useEffect(() => {
    setSetupMode('preliminary_check')
  }, [])


  // Fetch wallet balance when wallet is connected
  useEffect(() => {
    if (walletAddress && !walletBalance) {
      fetchWalletBalance()
    }
  }, [walletAddress, walletBalance])

  const fetchWalletBalance = async () => {
    if (!walletAddress) return
    
    try {
      const aoHelpers = await import('../../utils/ao-helpers')
      const balance = await aoHelpers.aoHelpers.getWalletBalance(walletAddress)
      setWalletBalance(balance)
    } catch (err) {
      console.error('Error fetching wallet balance:', err)
    }
  }

  const copyAddress = async () => {
    if (walletAddress) {
      try {
        await navigator.clipboard.writeText(walletAddress)
        setAddressCopied(true)
        setTimeout(() => setAddressCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy address:', err)
      }
    }
  }

  const handleProviderCreated = () => {
    // Refresh providers - setup is complete
    refreshProviders()
    // Could redirect to a different page or show success message
    console.log('Provider setup completed successfully!')
  }

  const handleProceedToSetup = () => {
    console.log('Setup.tsx: handleProceedToSetup called, switching to device_setup mode')
    setSetupMode('device_setup')
  }

  // Get device IP from provider info or use default
  const getProviderDeviceIp = (): string => {
    if (currentProvider && currentProvider.providerActivity?.provider_info) {
      try {
        const providerInfoString = typeof currentProvider.providerActivity.provider_info === 'string' 
          ? currentProvider.providerActivity.provider_info 
          : JSON.stringify(currentProvider.providerActivity.provider_info)
        const providerInfo = JSON.parse(providerInfoString)
        if (providerInfo.networkIp) {
          return providerInfo.networkIp
        }
      } catch (error) {
        console.error('Error parsing provider info:', error)
      }
    }
    return '192.168.4.1' // Default IP
  }

  const renderContent = () => {
    console.log('Setup.tsx: renderContent called with setupMode:', setupMode)
    
    switch (setupMode) {
      case 'preliminary_check':
        console.log('Setup.tsx: Rendering PreliminaryCheck component')
        return (
          <PreliminaryCheck
            walletAddress={walletAddress}
            walletBalance={walletBalance}
            isProviderOwner={currentProvider !== undefined}
            onProceedToSetup={handleProceedToSetup}
            onCopyAddress={copyAddress}
            addressCopied={addressCopied}
            onBalanceRefresh={fetchWalletBalance}
          />
        )

      case 'device_setup':
        console.log('Setup.tsx: Rendering CreateProvider component')
        return (
          <div className="device-setup-container">
            <div className="setup-header">
              <h2>Provider Device Setup</h2>
              <p>Configure your provider device and complete the setup process.</p>
            </div>
            <CreateProvider providerId={''}/>
          </div>
        )

      default:
        console.log('Setup.tsx: Unknown setupMode, returning null')
        return null
    }
  }

  return (
    <div className="setup-page">
      <main>
        <section className="setup-section">
          <div className="setup-container">
            {renderContent()}
          </div>
        </section>
      </main>
    </div>
  )
}
