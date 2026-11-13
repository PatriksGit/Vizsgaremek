import { config } from '@fortawesome/fontawesome-svg-core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Font Awesome's own CSS comes from index.css, in a cascade layer: injected at
// runtime it is unlayered and beats every Tailwind size-* class on an icon.
config.autoAddCss = false

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
