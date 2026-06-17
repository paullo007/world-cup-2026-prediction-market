import type { Metadata } from "next";
import { Suspense } from "react";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { CategoryNav, CategoryPills } from "@/components/CategoryNav";
import { AutoResolve } from "@/components/AutoResolve";

export const metadata: Metadata = {
  title: "World Cup 2026 Prediction Market",
  description:
    "Trade play-money predictions on the FIFA World Cup 2026 — match winners, tournament champion, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Global navigation progress bar: fires on every <Link> click and
            back/forward nav, so any tab/menu/link gives instant feedback while
            the server renders the next page. Gold to match the FIFA wordmark.
            position:fixed — does NOT add overflow/transform to body/main, so the
            sticky top region stays intact. */}
        <NextTopLoader
          color="#fbbf24"
          height={3}
          shadow="0 0 10px #fbbf24,0 0 5px #fbbf24"
          showSpinner={false}
          speed={300}
          crawlSpeed={150}
        />
        <Providers>
          {/* Self-heal: settle finished matches on any page view (throttled). */}
          <AutoResolve />
          {/* Sticky top region: the black header AND the category tab bar pin
              together at the top of the viewport while the page scrolls. */}
          <div id="wc-topbar" className="sticky top-0 z-40 border-b border-surface-border bg-surface">
            <Navbar />
            <div className="mx-auto max-w-6xl px-4 py-3">
              <Suspense fallback={<CategoryPills active={null} />}>
                <CategoryNav />
              </Suspense>
            </div>
          </div>
          <main className="mx-auto max-w-6xl px-4 pb-20 pt-6">
            {children}
          </main>
          <footer className="border-t border-surface-border py-8 text-center text-sm text-slate-500">
            World Cup 2026 Prediction Market — WC$ only, no real wagering.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
