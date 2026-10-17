import { authClient, SessionUser } from "@/api/authClient";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

// - What it does: it memoizes the function's result for one server render, which means one incoming request. If the NavBar, a layout and a page all call getSessionUser(), the first call hits the API and the rest reuse its result.
// - How results are matched: calls with the same arguments, compared by reference, share a result. Yours takes no arguments, so every call in a render shares one.
// - What it is not: it isn't a data cache. Nothing persists between requests, so the next page load fetches a fresh session. After login or logout the next request sees the new state, which is why it's safe for auth.
// - Where it works: during Server Component rendering (pages, layouts, the async NavBar). In Server Actions or route handlers, there's no render pass to dedupe in, so each call hits the API. That's harmless, but don't expect memoization there.
// - Gotcha: passing an object as an argument defeats the dedupe, because each new object counts as a different argument. You don't have that problem here.
export const getSessionUser = cache(async () => {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: {
        cookie: (await headers()).get("cookie") ?? "",
      },
    },
  });
  return session.data?.user as SessionUser | undefined;
});

export async function requireSessionUser(
  redirectTo?: string,
): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?redirectTo=" + encodeURIComponent(redirectTo || ""));
  }
  return user;
}
