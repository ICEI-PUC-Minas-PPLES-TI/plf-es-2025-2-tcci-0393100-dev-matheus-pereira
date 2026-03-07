import { Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Dashboard from '@/components/pages/Dashboard'
import WebClientes from '@/components/pages/WebClientes'
import WebInadimplentes from '@/components/pages/WebInadimplentes'
import WebRelatorios from '@/components/pages/WebRelatorios'
import WebServicos from '@/components/pages/WebServicos'
import WebReformaTributaria from '@/components/pages/WebReformaTributaria'
import WebCadastroUsuario from '@/components/pages/WebCadastroUsuario'
import Login from '@/components/pages/Login'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<WebClientes />} />
          <Route path="/inadimplentes" element={<WebInadimplentes />} />
          <Route path="/servicos" element={<WebServicos />} />
          <Route path="/relatorios" element={<WebRelatorios />} />
          <Route path="/reforma-tributaria" element={<WebReformaTributaria />} />
          <Route path="/usuarios/cadastro" element={<WebCadastroUsuario />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
