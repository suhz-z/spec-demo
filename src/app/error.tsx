"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is a safe correlation value; the message may contain internals.
    console.error("Unhandled application error", { digest: error.digest });
  }, [error.digest]);

  return (
    <main className="sg-container sg-section" id="main-content">
      <p className="sg-kicker">Something went wrong</p>
      <h1 className="sg-section__title">The page couldn&apos;t be loaded.</h1>
      <p className="sg-hero__lede" style={{ marginTop: "16px" }}>
        Try again. If the problem continues, contact the sales team and quote the reference below.
      </p>
      {error.digest ? <p className="sg-note">Reference: {error.digest}</p> : null}
      <div className="sg-actions">
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
