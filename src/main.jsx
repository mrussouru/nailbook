import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import PanelInterno from './PanelInterno.jsx'
import ReservaPublica from './ReservaPublica.jsx'
import Login from './Login.jsx'

import { UsuarioProvider } from "./context/UsuarioContext";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>

    <UsuarioProvider>

      <BrowserRouter>

        <Routes>

          {/* Página pública */}
          <Route
            path="/"
            element={<ReservaPublica />}
          />

          {/* Panel interno */}
          <Route
            path="/panel"
            element={
              <Login>
                <PanelInterno />
              </Login>
            }
          />

        </Routes>

      </BrowserRouter>

    </UsuarioProvider>

  </React.StrictMode>,
)