import Link from "next/link";

/** One brand lockup for the public site and the booking flow. */
export function SiteBrand({ className }: { className: string }) {
  return (
    <Link className={className} href="/" aria-label="Spectra Gardens home">
      SPECTRA <span>GARDENS</span>
    </Link>
  );
}
