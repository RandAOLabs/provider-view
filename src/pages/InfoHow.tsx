import React, { useState, useEffect } from 'react'
import { FiBookOpen, FiChevronDown, FiChevronUp, FiLoader } from 'react-icons/fi'
import { ConnectWallet } from '../components/common/ConnectWallet'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import axios from 'axios'
import './InfoHow.css'

// FAQ questions and answers
const FAQ_ITEMS = [
  {
    question: "I rebooted the server and now local and on-chain values don't match. Is that okay? What should I do?",
    answer: "" // Will be filled in by the user
  },
  {
    question: "I think something's wrong with my .env file — how do I check if it's set up correctly?",
    answer: "" // Will be filled in by the user
  },
  {
    question: "Can someone share the full steps to run the node on a Raspberry Pi (especially Pi 5)?",
    answer: "" // Will be filled in by the user
  },
  {
    question: "I have RNG-Test tokens but can't stake — getting a \"Failed to stake tokens\" error. Why?",
    answer: "" // Will be filled in by the user
  },
  {
    question: "My node is running, but DB size, on-chain, and local values are all 0. Any idea why?",
    answer: "" // Will be filled in by the user
  },
  {
    question: "I received tokens and my server is running, but it doesn't recognize me as a provider. What's missing?",
    answer: "" // Will be filled in by the user
  },
  {
    question: "Port 3000 is already in use — can I change it?",
    answer: "" // Will be filled in by the user
  },
  {
    question: "Getting this error: No such image: randao/puzzle-gen:v0.1.1 — how do I fix this?",
    answer: "" // Will be filled in by the user
  },
  {
    question: "Can I run this node on the same VPS as my Ario Gateway node?",
    answer: "" // Will be filled in by the user  
  },
  {
    question: "My node shut down randomly and \"Random Available\" shows -2. What does that mean?",
    answer: "" // Will be filled in by the user
  },
  {
    question: "What are the minimum requirements to run the node smoothly?",
    answer: "" // Will be filled in by the user
  },
  {
    question: "How many tokens do I need to become a full validator?",
    answer: "" // Will be filled in by the user
  },
  {
    question: "Where can I find a complete guide or documentation?",
    answer: "" // Will be filled in by the user
  }
]

// Type for code component in ReactMarkdown
interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function InfoHow() {
  // State to track which FAQ items are expanded
  const [expandedItems, setExpandedItems] = useState<number[]>([])
  const [readme, setReadme] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  // Toggle FAQ item expansion
  const toggleItem = (index: number) => {
    setExpandedItems(prevState => {
      if (prevState.includes(index)) {
        return prevState.filter(item => item !== index)
      } else {
        return [...prevState, index]
      }
    })
  }

  useEffect(() => {
    const fetchReadme = async () => {
      setLoading(true)
      try {
        // Fetch README from GitHub
        const response = await axios.get(
          'https://raw.githubusercontent.com/RandAOLabs/Randomness-Provider/main/README.md'
        )
        setReadme(response.data)
        setError('')
      } catch (err) {
        console.error('Error fetching README:', err)
        setError('Failed to load documentation. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchReadme()
  }, [])

  return (
    <div className="info-how-page">
      <ConnectWallet />
      <main>
        <section className="readme-section">
          <h1>Node Provider Setup Guide</h1>
          
          {loading ? (
            <div className="loading-container">
              <FiLoader className="loading-spinner" />
              <p>Loading documentation...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p>{error}</p>
              <p>Please check your connection and try refreshing the page.</p>
            </div>
          ) : (
            <div className="markdown-container">
              <ReactMarkdown 
                children={readme} 
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({node, ...props}) => (
                    <a target="_blank" rel="noopener noreferrer" {...props} />
                  ),
                  pre: ({node, ...props}) => (
                    <pre className="code-block" {...props} />
                  ),
                  code: ({node, inline, className, children, ...props}: CodeProps) => (
                    inline 
                      ? <code className={`inline-code ${className || ''}`} {...props}>{children}</code>
                      : <code className={className || ''} {...props}>{children}</code>
                  )
                }}
              />
            </div>
          )}
        </section>

        <section className="faq-section" id="frequently-asked-questions">
          <div className="faq-header">
            <FiBookOpen className="faq-icon" />
            <h2>Frequently Asked Questions</h2>
          </div>
          <div className="faq-container">
            {FAQ_ITEMS.map((item, index) => (
              <div key={index} className="faq-item">
                <div 
                  className="faq-question" 
                  onClick={() => toggleItem(index)}
                >
                  <h3>{item.question}</h3>
                  <div className="faq-icon">
                    {expandedItems.includes(index) ? <FiChevronUp /> : <FiChevronDown />}
                  </div>
                </div>
                {expandedItems.includes(index) && (
                  <div className="faq-answer">
                    {item.answer ? (
                      <p>{item.answer}</p>
                    ) : (
                      <p className="placeholder-answer">
                        This answer will be provided soon. Check back later for updated information.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
