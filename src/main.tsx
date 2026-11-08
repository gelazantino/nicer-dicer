import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { debugLog, isDebugMode } from './debug/debugMode'
import './index.css'

if (isDebugMode) {
  document.documentElement.dataset.debug = 'true'
  debugLog('debug mode enabled')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
