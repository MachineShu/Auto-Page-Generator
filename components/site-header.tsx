import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Tool Page Generator" },
  { href: "/blog-prompt-generator", label: "Blog Prompt Generator" },
  { href: "/auto-language", label: "Auto Language" }
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand">
          <span className="site-brand-mark">APG</span>
          <span className="site-brand-copy">
            <strong>Auto Page Generator</strong>
            <small>Internal SEO workflows</small>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="site-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
