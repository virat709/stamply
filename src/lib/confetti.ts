import confetti from "canvas-confetti";

// Brand-tinted celebration: main burst + a delayed cascade, respecting
// users who prefer reduced motion.
export function celebrate() {
  const colors = ["#d4af37", "#f0d98c", "#fff8df", "#b8952c", "#6366f1"];
  confetti({
    particleCount: 110,
    spread: 80,
    startVelocity: 42,
    scalar: 0.95,
    ticks: 240,
    origin: { y: 0.55 },
    colors,
    disableForReducedMotion: true,
  });
  window.setTimeout(() => {
    confetti({
      particleCount: 70,
      spread: 130,
      startVelocity: 30,
      scalar: 0.8,
      origin: { x: 0.2, y: 0.45 },
      colors,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 70,
      spread: 130,
      startVelocity: 30,
      scalar: 0.8,
      origin: { x: 0.8, y: 0.45 },
      colors,
      disableForReducedMotion: true,
    });
  }, 300);
}
