import React from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Products } from './pages/Products'
import { Raffle, Lootbox, CriticalStrike, Lottery, RandomNumber } from './pages/Products/ProductPages'
import { WalletProvider } from './contexts/WalletContext'
import { ProviderProvider } from './contexts/ProviderContext'
import { RequestsContextProvider } from './contexts/RequestsContext'
import './App.css'
import About from './pages/About/About'
import Providers from './pages/Providers/Providers'
import InfoHow from './pages/Info/InfoHow'
import Admin from './pages/Admin/Admin'
import Faucet from './pages/Faucet/Faucet'
import Setup from './pages/Setup/Setup'
import { Sidebar } from './components/common/Sidebar'


// Pages where sidebar should be hidden
const PAGES_WITHOUT_SIDEBAR = ['/setup']

function AppContent() {
  const location = useLocation()
  const shouldHideSidebar = PAGES_WITHOUT_SIDEBAR.includes(location.pathname)

  return (
    <div className="app-container">
      {!shouldHideSidebar && <Sidebar />}
      <main className={`main-content ${shouldHideSidebar ? 'full-width' : ''}`}>
        <Routes>
          <Route path="/" element={<Setup />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/about" element={<About />} />
          <Route path="/providers" element={<Providers />} />
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
  )
}

function App() {
  return (
    <WalletProvider>
      <ProviderProvider>
        <RequestsContextProvider>
          <Router>
            <AppContent />
          </Router>
        </RequestsContextProvider>
      </ProviderProvider>
    </WalletProvider>
  )
}

export default App
