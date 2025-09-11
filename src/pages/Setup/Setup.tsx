import React, { useState, useEffect } from 'react'

import { Spinner } from '../../components/common/Spinner'
import { useWallet } from '../../contexts/WalletContext'
import { useProviders } from '../../contexts/ProviderContext'
import DeviceSetupSteps from '../../components/setup/DeviceSetupSteps'
import PreliminaryCheck from '../../components/setup/PreliminaryCheck'
import './Setup.css'

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
    // Refresh providers - setup is complete
    refreshProviders()
    // Could redirect to a different page or show success message
    console.log('Provider setup completed successfully!')
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


      default:
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
