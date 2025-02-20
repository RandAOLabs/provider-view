import { FiArrowLeft } from 'react-icons/fi'
import './TopicPage.css'

export const TopicPage = ({ topic, onBack }) => {
  if (!topic) return null

  return (
    <div className="topic-page">
      <button className="back-button" onClick={onBack}>
        <FiArrowLeft /> Back to Topics
      </button>
      <div className="topic-content">
        <h1>{topic.title}</h1>
        <div className="content-placeholder">
          <p>This content is coming soon.</p>
          <p>The documentation for this topic is being prepared and will be available shortly.</p>
        </div>
      </div>
    </div>
  )
}
