import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function PublicLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="sg-site">
      <SiteHeader />
      <main className="sg-main" id="main-content">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
