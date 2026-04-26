import { describe, it, expect, vi, afterEach } from "vitest";
import { DASHBOARD_INVALIDATE_EVENT, invalidateDashboard } from "@/lib/dashboardRefresh";

describe("dashboardRefresh", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("DASHBOARD_INVALIDATE_EVENT tem o nome esperado", () => {
    expect(DASHBOARD_INVALIDATE_EVENT).toBe("dashboard-invalidate");
  });

  it("invalidateDashboard dispara CustomEvent no window", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    invalidateDashboard();
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const event = dispatchSpy.mock.calls[0][0];
    expect(event.type).toBe(DASHBOARD_INVALIDATE_EVENT);
    expect(event).toBeInstanceOf(CustomEvent);
    dispatchSpy.mockRestore();
  });
});
