"use client";

import { AnimatePresence, motion } from "motion/react";
import { Menu, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";
import { getLevelInfo } from "@/lib/gamification/levels";
import { useStoresHydrated } from "@/store/hydration";
import { useProgressStore } from "@/store/progress";
import { Logo } from "@/components/ui/logo";
import { LanguageSwitcher } from "./language-switcher";

const NAV = [
  { href: "/", key: "home" },
  { href: "/learn", key: "learn" },
  { href: "/practice", key: "studio" },
  { href: "/sheet-music", key: "sheetMusic" },
  { href: "/songs", key: "songs" },
  { href: "/profile", key: "profile" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 sm:px-4 print:hidden">
      <a
        href="#main"
        className="sr-only rounded-full bg-ink-800 px-4 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        {t.nav.skipToContent}
      </a>
      <div
        className={cn(
          "mx-auto mt-3 flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full px-3 pl-4 transition-[background-color,box-shadow,border-color] duration-300",
          scrolled || open ? "glass" : "border border-transparent",
        )}
      >
        <Link href="/" aria-label="MusicPath" onClick={() => setOpen(false)} className="rounded-full">
          <Logo />
        </Link>

        <nav aria-label={t.nav.primary} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative rounded-full px-4 py-2 text-sm transition-colors",
                      active ? "text-mist-50" : "text-mist-400 hover:text-mist-50",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 -z-10 rounded-full bg-white/[0.08] ring-1 ring-white/10"
                        transition={{ type: "spring", stiffness: 400, damping: 34 }}
                      />
                    )}
                    {t.nav[item.key]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <XpChip />
          <LanguageSwitcher className="max-sm:hidden" />
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full text-mist-200 hover:bg-white/[0.06] lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label={t.nav.primary}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="glass mt-2 rounded-3xl p-3 lg:hidden"
          >
            <ul className="flex flex-col">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex h-12 items-center rounded-2xl px-4 text-base",
                        active ? "bg-white/[0.08] text-mist-50" : "text-mist-200",
                      )}
                    >
                      {t.nav[item.key]}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] px-4 pt-3">
              <span className="text-sm text-mist-400">{t.language.label}</span>
              <LanguageSwitcher />
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function XpChip() {
  const { t } = useI18n();
  const hydrated = useStoresHydrated();
  const xp = useProgressStore((s) => s.xp);
  if (!hydrated) return <span className="skeleton hidden h-8 w-28 rounded-full! sm:block" aria-hidden />;
  const { level } = getLevelInfo(xp);
  return (
    <Link
      href="/profile"
      className="hidden h-8 items-center gap-1.5 rounded-full bg-gold/10 px-3 font-mono text-xs text-gold ring-1 ring-gold/25 transition-colors hover:bg-gold/15 sm:inline-flex"
    >
      <Sparkles className="size-3.5" aria-hidden />
      {format(t.nav.xpBadge, { level, xp })}
    </Link>
  );
}
