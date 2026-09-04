import { AppBar } from '@akhil-saxena/design-system/components/AppBar';
import { IconButton } from '@akhil-saxena/design-system/components/IconButton';
import { Link } from '@akhil-saxena/design-system/components/Link';
import { Moon, Sun } from '@akhil-saxena/design-system/icons';

export const NAV_ITEMS: ReadonlyArray<{
  readonly href: string;
  readonly label: string;
}> = [
  { href: '/development', label: 'development' },
  { href: '/photography', label: 'photography' },
];

export const THEME_TOGGLE_ID = 'pub-theme-toggle';

const WORDMARK_SUPPRESSED_ON = '/';

export type PublicNavVariant = 'bar' | 'plain' | 'rail';

export interface PublicNavProps {
  siteTitle: string;
  pathname: string;
  variant?: PublicNavVariant;
}

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ThemeToggle() {
  return (
    <IconButton
      id={THEME_TOGGLE_ID}
      className="pub-toggle"
      size="lg"
      label="Switch between the dark and light theme"
      icon={
        <>
          <span className="pub-theme-icon pub-theme-icon-sun">
            <Sun size={16} />
          </span>
          <span className="pub-theme-icon pub-theme-icon-moon">
            <Moon size={16} />
          </span>
        </>
      }
    />
  );
}

export function PublicNav({ siteTitle, pathname, variant = 'bar' }: PublicNavProps) {
  const showWordmark = pathname !== WORDMARK_SUPPRESSED_ON;

  const navVariant = 'quiet';

  const navLinks = NAV_ITEMS.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      variant={navVariant}
      className="pub-nav-link"
      aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}
    >
      <span className="pub-nav-text">{item.label}</span>
    </Link>
  ));

  if (variant === 'plain') {
    return (
      <div className="pub-nav-plain">
        <ThemeToggle />
      </div>
    );
  }

  if (variant === 'rail') {
    return (
      <div className="pub-nav-rail wk-nav-rail">
        <nav className="pub-nav-rail-links">{navLinks}</nav>
        <ThemeToggle />
      </div>
    );
  }

  return (
    <AppBar
      logo={
        showWordmark ? (
          <Link
            href="/"
            variant="quiet"
            className="pub-logo"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {siteTitle}
          </Link>
        ) : (
          false
        )
      }
      nav={navLinks}
      actions={<ThemeToggle />}
    />
  );
}
