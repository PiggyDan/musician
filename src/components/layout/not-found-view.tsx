"use client";

import { useI18n } from "@/i18n/use-i18n";
import { ButtonLink } from "@/components/ui/button";

export function NotFoundView() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 pt-32 text-center">
      <p className="font-display text-spectrum text-7xl font-medium">404</p>
      <h1 className="font-display mt-6 text-2xl font-medium sm:text-3xl">{t.notFound.title}</h1>
      <p className="mt-3 text-mist-400">{t.notFound.body}</p>
      <ButtonLink href="/" className="mt-8">
        {t.notFound.home}
      </ButtonLink>
    </div>
  );
}
