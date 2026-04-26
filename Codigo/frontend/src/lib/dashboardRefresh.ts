/**
 * Sinal para o Dashboard refazer as requisições de resumo e inadimplentes.
 * Deve ser chamado após criar, cancelar ou confirmar pagamento de inadimplência.
 */
export const DASHBOARD_INVALIDATE_EVENT = "dashboard-invalidate"

export function invalidateDashboard(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DASHBOARD_INVALIDATE_EVENT))
  }
}
