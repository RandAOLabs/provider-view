import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import Providers from './pages/Providers'
import { Products } from './pages/Products'
import { Raffle, Lootbox, CriticalStrike, Lottery, RandomNumber } from './pages/Products/ProductPages'
// Documentation page temporarily commented out - DO NOT REMOVE
// import Docs from './pages/Docs'
import About from './pages/About'
import InfoHow from './pages/InfoHow'
import Admin from './pages/Admin'
import Faucet from './pages/Faucet'
import { WalletProvider } from './contexts/WalletContext'
import { ProviderProvider } from './contexts/ProviderContext'
import './App.css'
import './pages/Providers.css'
// import './pages/Docs.css'  // Documentation CSS temporarily commented out
import './pages/About.css'
import './pages/InfoHow.css'
import './pages/Products/Raffle.css'
import './pages/Faucet.css'

function App() {
  return (
    <WalletProvider>
      <ProviderProvider>
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
            <Route path="/info/how" element={<InfoHow />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/faucet" element={<Faucet />} />
            <Route path="/products" element={<Products />}>
              <Route index element={<Raffle />} />
              <Route path="randomdraw" element={<Raffle />} />
              <Route path="lootbox" element={<Lootbox />} />
              <Route path="criticalstrike" element={<CriticalStrike />} />
              <Route path="lottery" element={<Lottery />} />
              <Route path="randomnumber" element={<RandomNumber />} />
            </Route>
          </Routes>
        </main>
        </div>
        </Router>
      </ProviderProvider>
    </WalletProvider>
  )
}

export default App
