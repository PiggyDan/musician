"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/use-i18n";
import { Logo } from "@/components/ui/logo";

export function SiteFooter() {
  const { t } = useI18n();
  const links = [
    { href: "/learn", label: t.nav.learn },
    { href: "/learn/piano", label: t.academy.title },
    { href: "/practice", label: t.nav.studio },
    { href: "/profile", label: t.nav.profile },
  ];

  return (
    <footer className="relative z-10 mt-24 border-t border-white/[0.06]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-mist-400">{t.footer.tagline}</p>
          <p className="max-w-sm text-xs text-mist-500">{t.footer.localNote}</p>
        </div>
        <nav aria-label={t.footer.product}>
          <p className="eyebrow mb-4">{t.footer.product}</p>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-mist-200 transition-colors hover:text-mist-50">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pb-10 text-xs text-mist-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © MusicPath · {t.footer.madeFor}
        </p>
        <p>Powered by Daniel Knight</p>
      </div>
    </footer>
  );
}
