import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Se importa aquí (y no solo desde Select.jsx) para garantizar que sus
// reglas base queden antes que el CSS de cada página en el bundle: así,
// cuando una página define su propia clase para un <Select> con el mismo
// nivel de especificidad (una sola clase), la de la página gana el empate
// por orden de aparición, en vez de depender de qué página lo importó primero.
import './shared/components/Select.css'
import App from './App.jsx'
import './shared/styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
