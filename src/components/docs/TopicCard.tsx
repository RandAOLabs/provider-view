import PropTypes from 'prop-types'
import './TopicCard.css'

export const TopicCard = ({ topic, onClick }) => {
  const handleClick = () => {
    onClick(topic)
  }

  return (
    <div 
      className="topic-card" 
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick()
        }
      }}
    >
      <h3>{topic.title}</h3>
      <p>{topic.description}</p>
      <span className="arrow" aria-hidden="true">→</span>
    </div>
  )
}

TopicCard.propTypes = {
  topic: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired
  }).isRequired,
  onClick: PropTypes.func.isRequired
}
