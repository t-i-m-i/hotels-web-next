import Link from "next/link";

const LINKS = [
  { href: "/", label: "Explore" },
  { href: "/map", label: "Map" },
  { href: "/bookings", label: "Bookings" },
  { href: "/account", label: "Account" },
];

export default function NavBar() {
  return (
    <nav className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
      <ul className="mx-auto flex w-full max-w-5xl gap-6 text-sm font-medium">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="hover:text-blue-600">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
