import { getSessionUser } from "@/lib/session";
import { handler, ok } from "@/lib/api";

export const GET = handler(async () => {
  const user = await getSessionUser();
  return ok({ user });
});

