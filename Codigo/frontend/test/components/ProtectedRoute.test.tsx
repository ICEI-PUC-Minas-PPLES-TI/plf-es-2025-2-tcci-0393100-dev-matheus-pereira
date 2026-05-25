import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({
  isMockEnabled: vi.fn(),
  AUTH_TOKEN_KEY: "sgi_token",
  USER_PROFILE_KEY: "sgi_user_profile",
}));

function renderWithRouter(initialEntries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<ProtectedRoute />}>
          <Route index element={<div>Conteúdo protegido</div>} />
        </Route>
        <Route path="/login" element={<div>Página de login</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.mocked(api.isMockEnabled).mockReturnValue(false);
    localStorage.clear();
  });

  it("renderiza o outlet quando há token no localStorage", () => {
    localStorage.setItem("sgi_token", "token123");
    renderWithRouter();
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
    expect(screen.queryByText("Página de login")).not.toBeInTheDocument();
  });

  it("redireciona para /login quando não há token", () => {
    renderWithRouter();
    expect(screen.getByText("Página de login")).toBeInTheDocument();
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
  });

  it("em modo mock renderiza o outlet sem exigir token", () => {
    vi.mocked(api.isMockEnabled).mockReturnValue(true);
    renderWithRouter();
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });
});
