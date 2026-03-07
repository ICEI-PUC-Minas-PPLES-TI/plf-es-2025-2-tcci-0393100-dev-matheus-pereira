import { Outlet, Navigate } from "react-router-dom";
import { AUTH_TOKEN_KEY, isMockEnabled } from "@/lib/api";

/**
 * Protege rotas que exigem autenticação.
 * Em modo mock não exige token; com backend real redireciona para /login se não houver token.
 */
export default function ProtectedRoute() {
  if (isMockEnabled()) return <Outlet />;
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}
