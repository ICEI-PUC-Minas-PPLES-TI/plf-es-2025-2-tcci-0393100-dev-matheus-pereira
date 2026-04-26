import { Outlet, Navigate } from "react-router-dom";
import { AUTH_TOKEN_KEY, isMockEnabled, USER_PROFILE_KEY } from "@/lib/api";

/**
 * Protege rotas que exigem autenticação.
 * Em modo mock não exige token; com backend real redireciona para /login se não houver token.
 */
type ProtectedRouteProps = {
  onlyProprietaria?: boolean;
};

export default function ProtectedRoute({ onlyProprietaria = false }: ProtectedRouteProps) {
  if (isMockEnabled() && !onlyProprietaria) return <Outlet />;
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return <Navigate to="/login" replace />;
  if (onlyProprietaria) {
    const perfil = localStorage.getItem(USER_PROFILE_KEY);
    if (perfil !== "PROPRIETARIA") {
      return <Navigate to="/dashboard" replace state={{ erroPermissao: "Apenas a proprietária pode aprovar cadastros." }} />;
    }
  }
  return <Outlet />;
}
