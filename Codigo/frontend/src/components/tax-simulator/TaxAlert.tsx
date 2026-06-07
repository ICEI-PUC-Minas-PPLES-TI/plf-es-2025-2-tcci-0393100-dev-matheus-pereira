import type { ReactNode } from "react";

type TaxAlertProps = {
  variant?: "info" | "warning";
  children: ReactNode;
};

export default function TaxAlert({ variant = "info", children }: TaxAlertProps) {
  return (
    <div className={`tax-sim__alert tax-sim__alert--${variant}`} role="status">
      {children}
    </div>
  );
}
