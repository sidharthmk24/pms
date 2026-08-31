import { requireApiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

export const GET = handler(async () => {
  const user = await requireApiUser();
  return ok({ user });
});
