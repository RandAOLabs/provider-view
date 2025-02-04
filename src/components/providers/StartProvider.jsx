import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ProviderDetails } from './ProviderDetails'
import { Spinner } from '../common/Spinner'
import './StartProvider.css'

export const StartProvider = ({ currentProvider }) => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [provider, setProvider] = useState(null)

  useEffect(() => {
    // Simulate a loading delay to prevent UI flashing
    const timer = setTimeout(() => {
      setProvider(currentProvider)
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [currentProvider])

  if (isLoading) {
    return <Spinner text="Checking provider status..." />
  }

  if (provider) {
    return <ProviderDetails provider={provider} onEdit={() => {}} />
  }

  return (
    <div className="add-provider">
      <h2>Become a Provider</h2>
      <p>By running a provider, you become a contributor to the ecosystem and can earn rewards.</p>
      <button className="start-btn" onClick={() => navigate('/become-provider')}>Become a Provider →</button>
    </div>
  )
}
