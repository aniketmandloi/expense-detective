import { db, organizationMember, organization } from "@expense-detective/db";
import { eq, and } from "drizzle-orm";

export async function getUserOrganizationMembership(
  userId: string,
  organizationId: string
) {
  const membership = await db
    .select()
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.userId, userId),
        eq(organizationMember.organizationId, organizationId)
      )
    )
    .limit(1);

  return membership[0] ?? null;
}

export async function getUserOrganizations(userId: string) {
  const memberships = await db
    .select({
      organization: organization,
      membership: organizationMember,
    })
    .from(organizationMember)
    .innerJoin(
      organization,
      eq(organizationMember.organizationId, organization.id)
    )
    .where(eq(organizationMember.userId, userId));

  return memberships;
}

export async function getUserDefaultOrganization(userId: string) {
  const memberships = await getUserOrganizations(userId);
  return memberships[0]?.organization ?? null;
}
