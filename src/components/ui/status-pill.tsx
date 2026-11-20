import { cn } from "@/lib/cn";

export type VillaStatus = "available" | "reserved" | "booked";

const DEFAULT_LABELS: Record<VillaStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  booked: "Booked",
};

export type StatusPillProps = {
  status: VillaStatus;
  label?: string;
  className?: string;
};

/**
 * Status always includes a text label. Colour is supplementary, never the only
 * signal (DESIGN.md §7.2).
 */
export function StatusPill({ status, label, className }: StatusPillProps) {
  return (
    <span className={cn("sg-status", `sg-status--${status}`, className)}>
      {label ?? DEFAULT_LABELS[status]}
    </span>
  );
}
