export function BrandMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="lk-brand-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7e7ae" />
          <stop offset="0.55" stopColor="#d4af37" />
          <stop offset="1" stopColor="#8a6d1f" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18" stroke="url(#lk-brand-gold)" strokeWidth="2" strokeDasharray="4 3" opacity="0.7" />
      <rect x="9" y="13" width="22" height="16" rx="3.5" stroke="url(#lk-brand-gold)" strokeWidth="1.8" fill="url(#lk-brand-gold)" fillOpacity="0.12" />
      <path
        d="M20 24.6c-3.7-2.3-5.9-4.4-5.9-6.6 0-1.6 1.3-2.9 2.9-2.9 1.1 0 2.1.6 3 1.5.9-.9 1.9-1.5 3-1.5 1.6 0 2.9 1.3 2.9 2.9 0 2.2-2.2 4.3-5.9 6.6Z"
        fill="url(#lk-brand-gold)"
      />
      <path d="M12 13v-2.2M28 13v-2.2" stroke="url(#lk-brand-gold)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
