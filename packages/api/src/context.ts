import type { NextRequest } from "next/server";
import { auth } from "@expense-detective/auth";
import { getUserDefaultOrganization } from "./lib/organizations";
import { db, organization, organizationMember } from "@expense-detective/db";
import { eq } from "drizzle-orm";

async function createDefaultOrganizationForUser(
  userId: string,
  userName: string,
  userEmail: string
) {
  // Create a default personal organization
  const orgId = crypto.randomUUID();
  const userSlug = userEmail
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");
  const slug = `${userSlug}-${orgId.slice(0, 8)}`;

  const [newOrg] = await db
    .insert(organization)
    .values({
      id: orgId,
      name: `${userName}'s Organization`,
      slug: slug,
    })
    .returning();

  // Add user as finance_admin (owner)
  await db.insert(organizationMember).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    userId: userId,
    role: "finance_admin",
  });

  return newOrg;
}

export async function createContext(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  // Get organization ID from header or query param
  const organizationId =
    req.headers.get("x-organization-id") ||
    new URL(req.url).searchParams.get("organizationId") ||
    null;

  // If user is authenticated, get their default organization if no org specified
  let defaultOrganization = null;
  if (session?.user && !organizationId) {
    defaultOrganization = await getUserDefaultOrganization(session.user.id);

    // If user has no organization, create a default one
    if (!defaultOrganization && session.user) {
      defaultOrganization = await createDefaultOrganizationForUser(
        session.user.id,
        session.user.name || "User",
        session.user.email
      );
    }
  }

  return {
    session,
    organizationId: organizationId ?? defaultOrganization?.id ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
