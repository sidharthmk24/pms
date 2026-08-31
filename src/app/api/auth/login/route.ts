import { z } from "zod";
import { verifyCredentials } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { audit } from "@/lib/audit";
import { fail, handler, ok } from "@/lib/api";

const LoginBody = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const POST = handler(async (req: Request) => {
  const { email, password } = LoginBody.parse(await req.json());
  const result = await verifyCredentials(email, password);

  if (!result.ok) {
    if (result.reason === "locked") {
      return fail(429, `Too many failed attempts. Try again in ${result.retryAfterMinutes} minute(s).`);
    }
    if (result.reason === "inactive") {
      return fail(403, "This account has been deactivated. Contact the owner.");
    }
    return fail(401, "Incorrect email or password");
  }

  await createSession(result.user.id);
  await audit({ userId: result.user.id, action: "login", entity: "user", entityId: result.user.id });

  return ok({ user: result.user });
});
