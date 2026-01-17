import React from 'react'
import { FiLoader, FiRefreshCw } from 'react-icons/fi'
import { ProviderInfoAggregate } from 'ao-js-sdk'

interface ProviderMetricsProps {
  provider: ProviderInfoAggregate | null
  totalRandomGraphQL?: number | null
  isLoadingGraphQL?: boolean
  onRefreshGraphQL?: () => void
}

export const ProviderMetrics: React.FC<ProviderMetricsProps> = ({
  provider,
  totalRandomGraphQL,
  isLoadingGraphQL = false,
  onRefreshGraphQL
}) => {
  const randomAvailable = provider?.providerActivity?.random_balance !== undefined ?
    provider.providerActivity.random_balance : 'N/A';

  return (
    <div className="detail-group">
      <label>Random Stats</label>
      <div className="detail-value">
        <div>Available: {randomAvailable}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Total Random Provided: {isLoadingGraphQL ? (
            <FiLoader className="animate-spin" size={14} style={{ display: 'inline-block' }} />
          ) : (
            <>
              {totalRandomGraphQL !== null && totalRandomGraphQL !== undefined ? totalRandomGraphQL : '—'}
              {onRefreshGraphQL && (
                <FiRefreshCw
                  size={14}
                  style={{ cursor: 'pointer', display: 'inline-block' }}
                  onClick={onRefreshGraphQL}
                  title="Refresh GraphQL data"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
