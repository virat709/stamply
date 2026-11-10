import Link from "next/link";
import { BrandMark } from "./BrandMark";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#08080d]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Loyalkard home">
          <BrandMark size={30} />
          <span className="text-lg font-bold tracking-tight">
            Loyalkard<span className="text-[#d4af37]">.</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-neutral-400 md:flex">
          <Link href="/about" className="transition hover:text-[#f0d98c]">
            About
          </Link>
          <Link href="/pricing" className="transition hover:text-[#f0d98c]">
            Pricing
          </Link>
          <Link href="/contact" className="transition hover:text-[#f0d98c]">
            Contact
          </Link>
          <Link href="/#faq" className="transition hover:text-[#f0d98c]">
            FAQ
          </Link>
          <Link href="/login" className="transition hover:text-[#f0d98c]">
            Sign in
          </Link>
        </nav>

        <Link href="/login" className="btn-gold rounded-full px-4 py-2 text-sm font-bold">
          Open console
        </Link>
      </div>
    </header>
  );
}
