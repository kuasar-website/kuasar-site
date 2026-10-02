import type { Metadata } from "next";

import { fontClassName } from "./fonts";
import "./globals.css";

// The 404 for any URL no locale route matches (openspec/changes/root-document-lang). The
// root layout lives under [locale], so there is no layout above this page: it renders its
// own <html>, fonts and global styles (enabled by experimental.globalNotFound in
// next.config.ts). Next.js returns status 404 and adds robots noindex itself.
//
// No locale is known here, so both languages are shown, each marked with its own lang
// (design/i18n.md, "404 and 500 pages"). The document default is English, the x-default
// locale. Static; never fetches Strapi.

export const metadata: Metadata = {
  title: "Sayfa bulunamadı · Page not found | KUASAR",
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={fontClassName}>
      <body className="min-h-full flex flex-col">
        <main className="mx-auto flex w-[min(calc(100%_-_2rem),76rem)] flex-1 flex-col justify-center gap-10 py-16">
          <section lang="tr" className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold text-ink">Sayfa bulunamadı</h1>
            <p className="text-ink-muted">
              Aradığınız sayfa yok.{" "}
              {/* Plain <a>: leaving this document for the [locale] root layout is a full page
                  load anyway, and importing next/link here added ~3.4 KB to every route. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/tr" className="font-medium text-ink underline">
                Ana sayfaya dön
              </a>
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <p className="text-3xl font-semibold text-ink">Page not found</p>
            <p className="text-ink-muted">
              This page does not exist.{" "}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/en" className="font-medium text-ink underline">
                Back to the home page
              </a>
            </p>
          </section>
        </main>
      </body>
    </html>
  );
}
