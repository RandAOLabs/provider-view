import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import Providers from './pages/Providers'
// Documentation page temporarily commented out - DO NOT REMOVE
// import Docs from './pages/Docs'
import About from './pages/About'
import BecomeProvider from './pages/BecomeProvider'
import { WalletProvider } from './contexts/WalletContext'
import './App.css'
import './pages/Providers.css'
// import './pages/Docs.css'  // Documentation CSS temporarily commented out
import './pages/About.css'

function App() {
  return (
    <WalletProvider>
      <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<About />} />
            <Route path="/providers" element={<Providers />} />
            {/* Documentation route temporarily commented out - DO NOT REMOVE
            <Route path="/docs" element={<Docs />} />
            */}
            <Route path="/about" element={<About />} />
            <Route path="/become-provider" element={<BecomeProvider />} />
          </Routes>
        </main>
      </div>
      </Router>
    </WalletProvider>
  )
}

export default App
