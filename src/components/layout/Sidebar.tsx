import React from 'react'
import { FiBook, FiInfo, FiFileText, FiUserPlus, FiUsers, FiPackage } from 'react-icons/fi'
import { FaTelegram, FaGithub, FaXTwitter } from 'react-icons/fa6'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../../contexts/WalletContext'
import { useState, useEffect } from 'react'
import { aoHelpers } from '../../utils/ao-helpers'
import './Sidebar.css'

export const Sidebar = () => {
  const location = useLocation()
  const { address: connectedAddress, isConnected } = useWallet()
  const [isProvider, setIsProvider] = useState(false)
  const [finishedLoading, setFinishedLoading] = useState(false)

  useEffect(() => {
    const checkIfProvider = async () => {
      if (isConnected) {
        try {
          // Get all providers info from the cached function instead of making separate API call
          const allProviders = await aoHelpers.getAllProvidersInfo()
          
          // Find the provider that matches the connected address
          const currentProvider = allProviders.find(p => p.providerId === connectedAddress)
          
          console.log("user data")
          console.log(currentProvider)
          console.log((parseInt(currentProvider?.providerInfo?.stake.amount || '0')))
          
          // Set provider status based on stake amount
          setIsProvider((parseInt(currentProvider?.providerInfo?.stake.amount || '0')) >= 1)
          setFinishedLoading(true)
        } catch (err) {
          console.error('Error checking provider status:', err)
          setIsProvider(false)
          setFinishedLoading(true)
        }
      } else {
        setIsProvider(false)
      }
    }

    checkIfProvider()
  }, [connectedAddress, isConnected])

  const isActive = (path) => location.pathname === path

  return (
    <div className="sidebar">
      <div className="logo">
        <img src="/rng-logo.svg" alt="RandAO Logo" />
      </div>
      <nav className="main-nav">
        <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
          <FiInfo />
          About
        </Link>
        <Link to="/providers" className={`nav-item ${isActive('/providers') ? 'active' : ''}`}>
          <FiUsers />
          Providers
        </Link>
        {/* <Link to="/products/randomdraw" className={`nav-item ${location.pathname.startsWith('/products') ? 'active' : ''}`}>
          <FiPackage />
          Products
        </Link> */}
        {( (!isConnected || !isProvider) && finishedLoading) && (
          <Link to="/become-provider" className={`nav-item ${isActive('/become-provider') ? 'active' : ''}`}>
            <FiUserPlus />
            Become a Provider
          </Link>
        )}
      </nav>
      <div className="bottom-section">
        <div className="bottom-nav">
          {/* Documentation button temporarily commented out - DO NOT REMOVE THIS CODE
          <Link to="/docs" className={`nav-item ${isActive('/docs') ? 'active' : ''}`}>
            <FiBook />
            Documentation
          </Link>
          */}
          <a href="https://randao_whitepaper.ar.io/" target="_blank" rel="noopener noreferrer" className="nav-item">
            <FiFileText />
            Whitepaper
          </a>
        </div>
        <div className="social-links">
          <a href="https://x.com/RandAOToken" target="_blank" rel="noopener noreferrer" className="social-link">
            <FaXTwitter />
          </a>
          <a href="https://t.me/ArcAOGames" target="_blank" rel="noopener noreferrer" className="social-link">
            <FaTelegram />
          </a>
          <a href="https://github.com/RandAOLabs" target="_blank" rel="noopener noreferrer" className="social-link">
            <FaGithub />
          </a>
        </div>
      </div>
    </div>
  )
}
