import { useNavigate } from 'react-router-dom'
import { ProviderDetails } from './ProviderDetails'
import './StartProvider.css'

export const StartProvider = ({ currentProvider }) => {
  const navigate = useNavigate()
  if (currentProvider) {
    return <ProviderDetails provider={currentProvider} onEdit={() => {}} />
  }

  return (
    <div className="add-provider">
      <h2>Become a Provider</h2>
      <p>By running a provider, you become a contributor to the ecosystem and can earn rewards.</p>
      <button className="start-btn" onClick={() => navigate('/become-provider')}>Become a Provider →</button>
    </div>
  )
}
