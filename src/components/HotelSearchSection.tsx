"use client";

import { useTransition } from "react";
import Search from "./Search";

export default function HotelSearchSection({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Search startTransitionAction={startTransition} />
      <div className={isPending ? "opacity-50 transition-opacity" : ""}>
        {children}
      </div>
    </>
  );
}
