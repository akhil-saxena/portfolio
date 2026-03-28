import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found" id="main">
      <h1 className="not-found-code">404</h1>
      <p className="not-found-text">This page does not exist.</p>
      <Link href="/" className="not-found-link">
        ← Back to home
      </Link>
    </main>
  );
}
