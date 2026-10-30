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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
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
