import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

/* Order matters: tokens define the vocabulary, base resets the document,
   then the page and the form compose on top of both. */
import './styles/tokens.css'
import './styles/base.css'
import './styles/login.css'
import './styles/form.css'
import './styles/dashboard.css'
import './styles/claims.css'
import './styles/chat.css'
import './styles/analytics.css'
import './styles/settings.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root container #root is missing from index.html')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
