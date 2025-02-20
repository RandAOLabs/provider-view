import './Spinner.css'

export const Spinner = ({ text }) => {
  return (
    <div className="spinner-container">
      <div className="spinner"></div>
      {text && <div className="spinner-text">{text}</div>}
    </div>
  )
}
