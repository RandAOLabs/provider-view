import React, { useState } from 'react'
import { FiWifi, FiMonitor, FiCheckCircle } from 'react-icons/fi'
import { ConnectWallet } from '../../components/common/ConnectWallet'
import './Setup.css'

export default function Setup() {
  const [showIframe, setShowIframe] = useState(false)

  const handleShowInterface = () => {
    setShowIframe(true)
  }

  return (
    <div className="setup-page">
      <ConnectWallet />
      <main>
        <div className="hero-section">
          <div className="hero-content">
            <h1>Device Setup</h1>
            <p>Connect to the "DeviceSetup" WiFi network, then access your device configuration interface.</p>
          </div>
          <div className="setup-icon">
            <FiMonitor size={40} />
          </div>
        </div>

        <section className="setup-section">
          <div className="setup-container">
            
            {!showIframe ? (
              <div className="setup-card">
                <div className="card-header">
                  <FiWifi />
                  <h3>Connect to DeviceSetup Network</h3>
                </div>
                <div className="card-content">
                  <div className="instructions">
                    <h4>Instructions:</h4>
                    <ol>
                      <li>Open your device's WiFi settings</li>
                      <li>Look for a network named <strong>"DeviceSetup"</strong></li>
                      <li>Connect to the DeviceSetup network</li>
                      <li>Click the button below to access the device interface</li>
                    </ol>
                  </div>
                  <button onClick={handleShowInterface} className="connect-button">
                    <FiCheckCircle />
                    I've Connected - Show Device Interface
                  </button>
                </div>
              </div>
            ) : (
              <div className="setup-card iframe-card">
                <div className="card-header">
                  <FiMonitor />
                  <h3>Device Configuration Interface</h3>
                </div>
                <div className="card-content">
                  <p>Configure your device using the interface below:</p>
                  <div className="iframe-container">
                    <iframe
                      src="http://192.168.4.1"
                      title="Device Setup Interface"
                      className="device-iframe"
                      sandbox="allow-same-origin allow-scripts allow-forms"
                    />
                  </div>
                  <div className="iframe-info">
                    <p>
                      <FiWifi />
                      If the interface doesn't load, ensure you're connected to the "DeviceSetup" network 
                      and the device is powered on.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </section>
      </main>
    </div>
  )
}
