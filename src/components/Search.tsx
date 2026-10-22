"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRef } from "react";

import { inputClass } from "@/components/auth/styles";

export default function Search({
  startTransitionAction,
}: {
  startTransitionAction: (callback: () => void) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleChange(value: string) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value) params.set("search", value);
      else params.delete("search");
      // router.replace -> each keystroke shouldn't add a new browser-history entry, or "back" becomes unusable
      startTransitionAction(() =>
        router.replace(`${pathname}?${params.toString()}`),
      );
    }, 300);
  }

  return (
    <div>
      <input
        type="search"
        placeholder="Search"
        // defaultValue, not value — this keeps the input uncontrolled so your own typing isn't fought by re-renders when the URL updates. If you use value + router's async navigation, keystrokes can feel laggy or get lost.
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}
