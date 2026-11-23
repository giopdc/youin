import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { APP_NAME, APP_TAGLINE, siteUrl } from "@/config/site";
import { getSession } from "@/lib/auth";
import { signOut } from "./actions";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f6f3ee" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = await getSession();
  return (
    <html lang="es">
      <body>
        <a className="skip" href="#contenido">Saltar al contenido</a>
        <header className="site">
          <div className="wrap wide">
            <Link href="/" className="brand" aria-label={`${APP_NAME}, inicio`}>{APP_NAME}<span className="dot" aria-hidden="true" /></Link>
            <nav aria-label="Principal">
              <Link href="/">Fiestas</Link>
              {user ? (
                <>
                  <Link href="/perfil">Mis planes</Link>
                  {isAdmin && <Link href="/admin">Admin</Link>}
                  <form action={signOut}>
                    <button type="submit">Salir</button>
                  </form>
                </>
              ) : (
                <Link href="/acceso">Entrar</Link>
              )}
            </nav>
          </div>
        </header>
        <main id="contenido" tabIndex={-1}>{children}</main>
      </body>
    </html>
  );
}
