import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { CategoryNav, CategoryPills } from "@/components/CategoryNav";

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
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 pb-20 pt-6">
            <Suspense fallback={<CategoryPills active={null} />}>
              <CategoryNav />
            </Suspense>
            <div className="mt-6">{children}</div>
          </main>
          <footer className="border-t border-surface-border py-8 text-center text-sm text-slate-500">
            World Cup 2026 Prediction Market — WC$ only, no real wagering.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
