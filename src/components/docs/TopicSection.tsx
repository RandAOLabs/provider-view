import { TopicCard } from './TopicCard'
import './TopicSection.css'

export const TopicSection = ({ section, onTopicClick }) => {
  return (
    <div className="docs-section">
      <h2>{section.title}</h2>
      <div className="topics">
        {section.topics.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            onClick={onTopicClick}
          />
        ))}
      </div>
    </div>
  )
}
