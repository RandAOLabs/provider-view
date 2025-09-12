import React from 'react'
import { IconType } from 'react-icons'
import './Setup.css'

interface StepCardProps {
  icon: IconType
  title: string
  children: React.ReactNode
}
//TO BE REMOVED AS JUST A BLOAT COMPONENT
export default function StepCard({ icon: Icon, title, children }: StepCardProps) {
  return (
    <div className="env-vars-section">
      <div className="env-vars-header">
        <div className="env-vars-title">
          <Icon />
          <h4>{title}</h4>
        </div>
      </div>
      <div className="env-vars-content">
        {children}
      </div>
    </div>
  )
}