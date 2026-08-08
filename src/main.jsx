import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PanelInterno from './PanelInterno.jsx'
import ReservaPublica from './ReservaPublica.jsx'
import Login from './Login.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Página pública: las clientas reservan acá. Ej: tusalon.vercel.app/ */}
        <Route path="/" element={<ReservaPublica />} />

        {/* Panel interno: vos y tu equipo. Ej: tusalon.vercel.app/panel */}
        <Route path="/panel" element={<Login><PanelInterno /></Login>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
