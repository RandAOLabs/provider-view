import React from 'react'
import { ProviderInfoAggregate } from 'ao-js-sdk'

interface ProviderMetricsProps {
  provider: ProviderInfoAggregate | null
}

export const ProviderMetrics: React.FC<ProviderMetricsProps> = ({ provider }) => {
  return (
    <>
      <div className="detail-group">
        <label>Random Available</label>
        <div className="detail-value">
          {provider?.providerActivity?.random_balance !== undefined ? 
            provider.providerActivity.random_balance : 'N/A'}
        </div>
      </div>
      
      <div className="detail-group">
        <label>Random Provided</label>
        <div className="detail-value">
          {provider?.totalFullfullilled !== undefined ? 
            provider.totalFullfullilled : '0'}
        </div>
      </div>
      
      <div className="detail-group">
        <label>Random Value Fee</label>
        <div className="detail-value">
          0
        </div>
      </div>
    </>
  )
}
