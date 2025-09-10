import React, { useState, useEffect } from 'react'
import { ConnectWallet } from '../../components/common/ConnectWallet'
import { Spinner } from '../../components/common/Spinner'
import { useWallet } from '../../contexts/WalletContext'
import { useProviders } from '../../contexts/ProviderContext'
import DeviceSetupSteps from '../../components/setup/DeviceSetupSteps'
import ProviderManagementTabs from '../../components/setup/ProviderManagementTabs'
import PreliminaryCheck from '../../components/setup/PreliminaryCheck'
import './Setup.css'
import { FiMonitor } from 'react-icons/fi'

type SetupMode = 'checking_owner' | 'preliminary_check' | 'device_setup' | 'provider_management'

export default function Setup() {
  const { address: walletAddress } = useWallet()
  const { providers, currentProvider, refreshProviders, loading } = useProviders()
  const [setupMode, setSetupMode] = useState<SetupMode>('checking_owner')
  const [addressCopied, setAddressCopied] = useState(false)
  const [walletBalance, setWalletBalance] = useState<string | null>(null)

  // Determine setup mode based on wallet connection, provider ownership, and balance
  useEffect(() => {
    // If still loading provider data, show checking state
    if (loading) {
      setSetupMode('checking_owner')
      return
    }

    // Check if user is a provider owner
    const isProviderOwner = currentProvider !== undefined
    
    if (isProviderOwner) {
      // Owner path: bypass checks, go straight to management
      setSetupMode('provider_management')
      return
    }

    // Non-owner path: show preliminary check
    setSetupMode('preliminary_check')
  }, [currentProvider, loading])

  // Fetch wallet balance when wallet is connected
  useEffect(() => {
    if (walletAddress && !walletBalance) {
      const fetchBalance = async () => {
        try {
          const aoHelpers = await import('../../utils/ao-helpers')
          const balance = await aoHelpers.aoHelpers.getWalletBalance(walletAddress)
          setWalletBalance(balance)
        } catch (err) {
          console.error('Error fetching wallet balance:', err)
        }
      }
      fetchBalance()
    }
  }, [walletAddress, walletBalance])

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
    // Refresh providers and switch to management mode
    refreshProviders()
    setSetupMode('provider_management')
  }

  const handleProceedToSetup = () => {
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
    switch (setupMode) {
      case 'checking_owner':
        return (
          <div className="loading-container">
            <Spinner text="Checking provider ownership..." />
          </div>
        )

      case 'preliminary_check':
        return (
          <PreliminaryCheck
            walletAddress={walletAddress}
            walletBalance={walletBalance}
            isProviderOwner={currentProvider !== undefined}
            onProceedToSetup={handleProceedToSetup}
            onCopyAddress={copyAddress}
            addressCopied={addressCopied}
          />
        )

      case 'device_setup':
        return (
            <DeviceSetupSteps 
              walletAddress={walletAddress!}
              walletBalance={walletBalance}
              onProviderCreated={handleProviderCreated}
              deviceIp={'192.168.4.1'}
            />
        )

      case 'provider_management':
        return (
          <div className="management-container">
            <ProviderManagementTabs
              walletAddress={walletAddress!}
              walletBalance={walletBalance}
              deviceIp={getProviderDeviceIp()}
              onProviderUpdated={refreshProviders}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="setup-page">
      <ConnectWallet />
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
