import React from 'react'
import { FiInfo, FiUsers, FiHelpCircle, FiDollarSign, FiFileText } from 'react-icons/fi'
import { FaTelegram, FaGithub, FaXTwitter } from 'react-icons/fa6'
import { Link, useLocation } from 'react-router-dom'
import rngLogo from '../../assets/rng-logo.svg'
import './Sidebar.css'

export const Sidebar = () => {
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <div className="sidebar">
      <div className="logo">
        <img src={rngLogo} alt="RandAO Logo" />
      </div>
      <nav className="main-nav">
        <Link to="/about" className={`nav-item ${isActive('/about') ? 'active' : ''}`}>
          <FiInfo />
          About
        </Link>
        <Link to="/providers" className={`nav-item ${isActive('/providers') ? 'active' : ''}`}>
          <FiUsers />
          Providers
        </Link>
        <Link to="/info/how" className={`nav-item ${isActive('/info/how') ? 'active' : ''}`}>
          <FiHelpCircle />
          How To
        </Link>
        <Link to="/faucet" className={`nav-item ${isActive('/faucet') ? 'active' : ''}`}>
          <FiDollarSign />
          Faucet
        </Link>

      </nav>
      <div className="bottom-section">
        <div className="bottom-nav">
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
