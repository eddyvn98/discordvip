import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  variant?: "success" | "warning" | "danger" | "info";
  className?: string;
};

export function Badge({ children, variant = "info", className = "" }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  );
}
