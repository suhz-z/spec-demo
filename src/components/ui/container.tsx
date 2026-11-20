import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type ContainerProps = {
  children: ReactNode;
  className?: string;
  flow?: boolean;
};

export function Container({ children, className, flow = false }: ContainerProps) {
  return (
    <div className={cn(flow ? "sg-flow-container" : "sg-container", className)}>{children}</div>
  );
}
