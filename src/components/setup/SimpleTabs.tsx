import React from 'react'
import { FiCheck } from 'react-icons/fi'
import './Setup.css'

interface Tab {
  id: string
  title: string
  icon: React.ComponentType
  isCompleted?: boolean
  isEnabled?: boolean
}

interface SimpleTabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  children: React.ReactNode
  mode?: 'gated' | 'ungated' // gated for setup (sequential), ungated for management (free navigation)
}

export default function SimpleTabs({ tabs, activeTab, onTabChange, children, mode = 'ungated' }: SimpleTabsProps) {
  const handleTabClick = (tabId: string, tab: Tab) => {
    if (mode === 'gated') {
      // In gated mode, only allow clicking if tab is enabled
      if (tab.isEnabled !== false) {
        onTabChange(tabId)
      }
    } else {
      // In ungated mode, allow free navigation
      onTabChange(tabId)
    }
  }

  return (
    <div className={`simple-tabs ${mode === 'gated' ? 'gated-mode' : 'ungated-mode'}`}>
      <div className="simple-tabs-header">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.id === activeTab
          const isClickable = mode === 'ungated' || tab.isEnabled !== false
          const isCompleted = tab.isCompleted || false
          
          return (
            <button
              key={tab.id}
              className={`simple-tab-button ${
                isActive ? 'active' : ''
              } ${
                !isClickable ? 'disabled' : ''
              } ${
                isCompleted ? 'completed' : ''
              }`}
              onClick={() => handleTabClick(tab.id, tab)}
              disabled={!isClickable}
            >
              {isCompleted && mode === 'gated' ? <FiCheck /> : <Icon />}
              <span>{tab.title}</span>
            </button>
          )
        })}
      </div>
      
      <div className="simple-tab-content">
        {children}
      </div>
    </div>
  )
}