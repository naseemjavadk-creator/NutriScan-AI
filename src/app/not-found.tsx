import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <h1 className="text-4xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted">That page doesn’t exist. Head back and scan a meal instead.</p>
      <Link href="/scan" className="btn-primary mt-6">Scan a meal</Link>
    </div>
  );
}
