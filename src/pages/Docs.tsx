import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TopicPage } from '../components/docs/TopicPage'
import { DocsContent } from '../components/docs/DocsContent'
import { ConnectWallet } from '../components/common/ConnectWallet'
import './Docs.css'

const DOCS_SECTIONS = [
  {
    title: "Getting Started",
    topics: [
      {
        id: "node-setup",
        title: "How to Start Your Node?",
        description: "Quick guide to set up and run your RandAO validator node."
      },
      {
        id: "why-operator",
        title: "Why Become a Node Operator?",
        description: "Discover the benefits of being a RandAO validator and contributing to decentralized randomness."
      },
      {
        id: "requirements",
        title: "System Requirements",
        description: "Hardware and software requirements for running a RandAO validator node."
      }
    ]
  },
  {
    title: "Core Concepts",
    topics: [
      {
        id: "randomness",
        title: "Understanding Verifiable Randomness",
        description: "Learn how RandAO ensures true, verifiable randomness on Arweave."
      },
      {
        id: "consensus",
        title: "Consensus Mechanism",
        description: "How RandAO achieves distributed consensus for random number generation."
      },
      {
        id: "rewards",
        title: "Rewards and Incentives",
        description: "Overview of the economic model and rewards for node operators."
      }
    ]
  },
  {
    title: "Advanced Topics",
    topics: [
      {
        id: "security",
        title: "Security Best Practices",
        description: "Essential security measures for protecting your validator node."
      },
      {
        id: "monitoring",
        title: "Node Monitoring",
        description: "Tools and tips for monitoring your node performance and health."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting Guide",
        description: "Common issues and their solutions when running a validator node."
      }
    ]
  },
  {
    title: "Integration",
    topics: [
      {
        id: "api",
        title: "API Reference",
        description: "Complete API documentation for integrating RandAO in your applications."
      },
      {
        id: "smartweave",
        title: "SmartWeave Integration",
        description: "How to use RandAO with SmartWeave contracts."
      },
      {
        id: "examples",
        title: "Example Projects",
        description: "Real-world examples of applications using RandAO."
      }
    ]
  }
]

export default function Docs() {
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const topicId = searchParams.get('topic')
    if (topicId) {
      // Find the topic in all sections
      for (const section of DOCS_SECTIONS) {
        const topic = section.topics.find(t => t.id === topicId)
        if (topic) {
          setSelectedTopic(topic)
          break
        }
      }
    }
  }, [searchParams])

  return (
    <div className="docs-page">
      <ConnectWallet />
      <main>
        {selectedTopic ? (
          <TopicPage topic={selectedTopic} onBack={() => setSelectedTopic(null)} />
        ) : (
          <DocsContent sections={DOCS_SECTIONS} onTopicClick={setSelectedTopic} />
        )}
      </main>
    </div>
  )
}
