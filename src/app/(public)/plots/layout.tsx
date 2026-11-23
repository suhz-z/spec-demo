import type { ReactNode } from "react";

import { FlowProvider } from "@/components/flow/flow-provider";

import "@/components/flow/flow.css";
import "@/components/wireframe/wireframe.css";

export default function PlotsLayout({ children }: { children: ReactNode }) {
  return (
    <FlowProvider>
      <div id="wireframe-app" className="flow-root">
        {children}
      </div>
    </FlowProvider>
  );
}
