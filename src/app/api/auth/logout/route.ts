import { destroySession } from "@/lib/session";
import { audit } from "@/lib/audit";
import { handler, ok } from "@/lib/api";

export const POST = handler(async () => {
  const userId = await destroySession();
  if (userId) await audit({ userId, action: "logout", entity: "user", entityId: userId });
  return ok({ signedOut: true });
});
