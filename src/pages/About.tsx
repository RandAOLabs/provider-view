import React, { useState, useEffect } from 'react'
import { FiGithub, FiGlobe, FiLoader } from 'react-icons/fi'
import { FaXTwitter } from 'react-icons/fa6'
import { FaTelegram } from 'react-icons/fa'
import { ConnectWallet } from '../components/common/ConnectWallet'
import { useProviders } from '../contexts/ProviderContext'
import { getTotalProvided } from '../utils/graphQLquery'
import './About.css'

const TEAM_MEMBERS = [
  {
    name: "Ethan Goldsteinberg",
    role: "Core Developer",
    avatar: '/ethan.avif',
    github: "https://github.com/Ethan-GoldS",
    twitter: null
  },
  {
    name: "Kenny Swayzee",
    role: "Protocol Designer",
    avatar: '/kenny.avif',
    github: "https://github.com/KennySwayzee93",
    twitter: "https://x.com/KennySwayzeeX"
  },
  {
    name: "Caitly",
    role: "Research Lead",
    avatar: '/caitlyn.avif',
    github: null,
    twitter: "https://x.com/CaitlyNFTLane"
  }
]

const STATIC_STATS = [
  { label: "Network Uptime", value: "99.99%" },
  { label: "Community Members", value: "5,000+" }
]

export default function About() {
  const { providers, loading: loadingProviders } = useProviders() // Get providers from context
  const [transactionCount, setTransactionCount] = useState(0)
  const [loadingTransactions, setLoadingTransactions] = useState(true)

  useEffect(() => {
    // Fetch transaction count independently
    const fetchTransactions = async () => {
      try {
        console.log('Fetching transactions...');
        const totalTransactions = await getTotalProvided();
        console.log('Total transactions fetched:', totalTransactions);
        setTransactionCount(totalTransactions);
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        setLoadingTransactions(false);
      }
    };

    fetchTransactions();
  }, []);

  const STATS = [
    { 
      label: "Total Providers", 
      value: loadingProviders ? (
        <div className="loading-spinner">
          <FiLoader className="animate-spin" />
        </div>
      ) : providers.length.toString() 
    },
    { 
      label: "Total Random Provided", 
      value: loadingTransactions ? (
        <div className="loading-spinner">
          <FiLoader className="animate-spin" />
        </div>
      ) : transactionCount.toLocaleString()
    },
    ...STATIC_STATS
  ]
  return (
    <div className="about-page">
      <ConnectWallet />
      <main>
        <div className="hero-section">
          <div className="hero-content">
            <h1>Building the Future of Decentralized Randomness</h1>
            <p>RandAO is pioneering verifiable random number generation on Arweave, enabling fair and transparent applications across the blockchain ecosystem.</p>
          </div>
          <div className="gradient-sphere"></div>
        </div>

        <div className="disclaimer-section">
          <div className="disclaimer-content">
            <h3>Important Notice</h3>
            <p>The RNG token currently has no value and is for testing purposes only. This is not the token that will be used in mainnet. Providers will be incentivised for their contribution to testnet.</p>
          </div>
        </div>

        <section className="stats-section">
          <div className="stats-grid">
            {STATS.map((stat, index) => (
              <div key={index} className="stat-card">
                <h3>{stat.value}</h3>
                <p>{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mission-section">
          <h2>Our Mission</h2>
          <div className="mission-content">
            <div className="mission-card">
              <h3>Decentralization</h3>
              <p>Building a truly decentralized network of validators to ensure unbiased randomness generation.</p>
            </div>
            <div className="mission-card">
              <h3>Innovation</h3>
              <p>Pushing the boundaries of blockchain technology to create novel solutions for random number generation.</p>
            </div>
            <div className="mission-card">
              <h3>Community</h3>
              <p>Fostering an engaged community of developers, validators, and users to grow the ecosystem.</p>
            </div>
          </div>
        </section>

        <section className="team-section">
          <h2>Meet the Team</h2>
          <div className="team-grid">
            {TEAM_MEMBERS.map((member, index) => (
              <div key={index} className="team-card">
                <img src={member.avatar} alt={member.name} className="avatar" />
                <h3>{member.name}</h3>
                <p>{member.role}</p>
                <div className="social-links">
                  {member.github && (
                    <a href={member.github} target="_blank" rel="noopener noreferrer">
                      <FiGithub />
                    </a>
                  )}
                  {member.twitter && (
                    <a href={member.twitter} target="_blank" rel="noopener noreferrer">
                      <FaXTwitter />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="contact-section">
          <h2>Get Involved</h2>
          <div className="contact-cards">
            <a href="https://github.com/RandAOLabs" target="_blank" rel="noopener noreferrer" className="contact-card">
              <FiGithub />
              <h3>GitHub</h3>
              <p>Contribute to our open-source projects</p>
            </a>
            <a href="https://x.com/RandAOToken" target="_blank" rel="noopener noreferrer" className="contact-card">
              <FaXTwitter />
              <h3>X</h3>
              <p>Follow us for the latest updates</p>
            </a>
            <a href="https://t.me/ArcAOGames" target="_blank" rel="noopener noreferrer" className="contact-card">
              <FaTelegram />
              <h3>Telegram</h3>
              <p>Join our community chat</p>
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}
