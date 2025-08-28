import React from 'react'
import { ProviderInfoAggregate } from 'ao-js-sdk'

interface ProviderMetricsProps {
  provider: ProviderInfoAggregate | null
}

export const ProviderMetrics: React.FC<ProviderMetricsProps> = ({ provider }) => {
  const randomAvailable = provider?.providerActivity?.random_balance !== undefined ? 
    provider.providerActivity.random_balance : 'N/A';
  const randomProvided = provider?.totalFullfullilled !== undefined ? 
    provider.totalFullfullilled : '0';

  return (
    <div className="detail-group">
      <label>Random Stats</label>
      <div className="detail-value">
        Available: {randomAvailable} | Provided: {randomProvided}
      </div>
    </div>
  )
}
