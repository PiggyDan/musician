import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Onest, Unbounded } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

// All three faces include cyrillic-ext, which covers Mongolian Ө and Ү.
const display = Unbounded({
  variable: "--font-display-face",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

const body = Onest({
  variable: "--font-body-face",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-face",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MusicPath — Learn music by playing it",
    template: "%s · MusicPath",
  },
  description:
    "An interactive music academy. Play a real synthesized piano in your browser, follow guided lessons and level up as you learn.",
  applicationName: "MusicPath",
};

export const viewport: Viewport = {
  themeColor: "#05050b",
  colorScheme: "dark",
};

/**
 * Runs before first paint. Saved language lives in localStorage, which the
 * server can't read, so a Mongolian learner would briefly see English. This
 * sets <html lang> and hides the page until React has rendered in Mongolian
 * (AppProviders removes the class; a timeout guarantees it never stays hidden).
 */
const LOCALE_BOOTSTRAP = `(function(){try{var s=JSON.parse(localStorage.getItem("musicpath:settings")||"null");if(s&&s.state&&s.state.locale==="mn"){var d=document.documentElement;d.lang="mn-MN";d.classList.add("locale-pending");setTimeout(function(){d.classList.remove("locale-pending")},2000)}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_BOOTSTRAP }} />
      </head>
      <body className="flex min-h-full flex-col">
        <AppProviders>
          <SiteHeader />
          <main id="main" className="relative z-10 flex-1 overflow-x-clip">
            {children}
          </main>
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}
