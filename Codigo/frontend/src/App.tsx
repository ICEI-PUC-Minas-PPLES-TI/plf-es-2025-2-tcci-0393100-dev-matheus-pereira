import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Dashboard from '@/components/pages/Dashboard'
import WebClientes from '@/components/pages/WebClientes'
import WebInadimplentes from '@/components/pages/WebInadimplentes'
import WebInadimplentesHonorarios from '@/components/pages/WebInadimplentesHonorarios'
import WebRelatorios from '@/components/pages/WebRelatorios'
import WebServicos from '@/components/pages/WebServicos'
import WebReformaTributaria from '@/components/pages/WebReformaTributaria'
import WebCadastroUsuario from '@/components/pages/WebCadastroUsuario'
import WebUsuarios from '@/components/pages/WebUsuarios'
import Login from '@/components/pages/Login'
import LandingPage from '@/components/pages/LandingPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clientes" element={<WebClientes />} />
          <Route path="/inadimplentes" element={<WebInadimplentes />} />
          <Route path="/inadimplentes/:clienteId/honorarios" element={<WebInadimplentesHonorarios />} />
          <Route path="/servicos" element={<WebServicos />} />
          <Route path="/relatorios" element={<WebRelatorios />} />
          <Route path="/reforma-tributaria" element={<WebReformaTributaria />} />
          <Route path="/usuarios/cadastro" element={<WebCadastroUsuario />} />
          <Route element={<ProtectedRoute onlyProprietaria />}>
            <Route path="/usuarios" element={<WebUsuarios />} />
            <Route path="/usuarios/pendentes" element={<Navigate to="/usuarios?aba=pendentes" replace />} />
            <Route path="/usuarios/ativos" element={<Navigate to="/usuarios" replace />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
