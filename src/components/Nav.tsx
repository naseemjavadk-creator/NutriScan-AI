"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";

const LINKS = [
  { href: "/dashboard", label: "Today" },
  { href: "/scan", label: "Scan" },
  { href: "/history", label: "History" },
  { href: "/profile", label: "Profile" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setSignedIn(false);
      return;
    }
    const sb = createClient();
    sb.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session?.user)));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold">
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-leaf-600">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white" />
            </span>
            NutriScan AI
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {signedIn &&
              LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active(l.href) ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-[15px] font-medium ${active(l.href) ? "bg-leaf-100 text-leaf-700" : "text-muted hover:text-ink"}`}
                >
                  {l.label}
                </Link>
              ))}
            {signedIn === false && (
              <>
                <Link href="/scan" className="btn-quiet">Scan a meal</Link>
                <Link href="/login" className="btn-quiet">Log in</Link>
                <Link href="/signup" className="btn-primary">Sign up</Link>
              </>
            )}
            {signedIn && <button onClick={signOut} className="btn-quiet">Log out</button>}
          </nav>

          {signedIn === false && (
            <Link href="/login" className="btn-secondary md:hidden">Log in</Link>
          )}
        </div>
      </header>

      {signedIn && (
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(l.href) ? "page" : undefined}
              className={`flex min-h-[56px] items-center justify-center text-sm font-medium ${active(l.href) ? "text-leaf-700" : "text-muted"}`}
            >
              <span className={`rounded-full px-3 py-1 ${active(l.href) ? "bg-leaf-100" : ""}`}>{l.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
