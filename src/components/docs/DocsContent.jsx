import { TopicSection } from './TopicSection'
import './DocsContent.css'

export const DocsContent = ({ sections, onTopicClick }) => {
  return (
    <>
      <div className="content">
        <div className="docs-grid">
          {sections.map((section) => (
            <TopicSection
              key={section.title}
              section={section}
              onTopicClick={onTopicClick}
            />
          ))}
        </div>
      </div>
    </>
  )
}
