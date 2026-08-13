import Link from "next/link";

const LINKS = [
  { href: "/", label: "Explore" },
  { href: "/map", label: "Map" },
  { href: "/my-bookings", label: "My Bookings" },
];

export default function NavBar() {
  return (
    <nav className="border-b border-neutral-200 px-4 py-3">
      <ul className="flex gap-6 text-sm font-medium">
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
