import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/config/site";
import { getSession } from "@/lib/auth";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e0e10" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = await getSession();
  return (
    <html lang="es">
      <body>
        <header className="site">
          <div className="wrap wide">
            <Link href="/" className="brand">{APP_NAME}</Link>
            <nav aria-label="Principal">
              <Link href="/">Eventos</Link>
              {user ? (
                <>
                  <Link href="/perfil">Mi perfil</Link>
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
        <main>{children}</main>
      </body>
    </html>
  );
}
