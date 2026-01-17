import React from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Products } from './pages/Products'
import { Raffle, Lootbox, CriticalStrike, Lottery, RandomNumber } from './pages/Products/ProductPages'
import { WalletProvider } from './contexts/WalletContext'
import { ProviderProvider } from './contexts/ProviderContext'
import { RequestsContextProvider } from './contexts/RequestsContext'
import { TotalFulfilledProvider } from './contexts/TotalFulfilledContext'
import './App.css'
import About from './pages/About/About'
import Providers from './pages/Providers/Providers'
import InfoHow from './pages/Info/InfoHow'
import Admin from './pages/Admin/Admin'
import Faucet from './pages/Faucet/Faucet'
import { Sidebar } from './components/common/Sidebar'
import { useClientInitialization } from './hooks/useClientInitialization'


function AppContent() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Providers />} />
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
  const { isInitialized, error } = useClientInitialization();

  // Show loading state while clients initialize
  if (!isInitialized && !error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div>Initializing RandAO clients...</div>
        <div style={{ fontSize: '0.875rem', color: '#666' }}>
          This prevents duplicate queries by pre-initializing all clients
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ color: '#f44336' }}>Failed to initialize clients</div>
        <div style={{ fontSize: '0.875rem', color: '#666' }}>
          {error.message}
        </div>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <WalletProvider>
      <ProviderProvider>
        <TotalFulfilledProvider>
          <RequestsContextProvider>
            <Router>
              <AppContent />
            </Router>
          </RequestsContextProvider>
        </TotalFulfilledProvider>
      </ProviderProvider>
    </WalletProvider>
  )
}

export default App
