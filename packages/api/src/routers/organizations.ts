import { z } from "zod";
import { router, protectedProcedure, organizationProcedure } from "../index";
import {
  db,
  organization,
  organizationMember,
  user,
} from "@expense-detective/db";
import { eq, and, inArray } from "drizzle-orm";

export const organizationsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Organization name is required"),
        slug: z
          .string()
          .min(1)
          .regex(
            /^[a-z0-9-]+$/,
            "Slug must be lowercase alphanumeric with hyphens"
          ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = crypto.randomUUID();

      // Create organization
      const [newOrg] = await db
        .insert(organization)
        .values({
          id: orgId,
          name: input.name,
          slug: input.slug,
        })
        .returning();

      // Add user as finance_admin (owner) of the organization
      await db.insert(organizationMember).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        userId: ctx.session.user.id,
        role: "finance_admin",
      });

      return newOrg;
    }),

  createDefault: protectedProcedure.mutation(async ({ ctx }) => {
    // Check if user already has an organization
    const existingOrgs = await db
      .select()
      .from(organizationMember)
      .where(eq(organizationMember.userId, ctx.session.user.id))
      .limit(1);

    if (existingOrgs.length > 0) {
      // User already has an organization, return it
      const [org] = await db
        .select()
        .from(organization)
        .where(eq(organization.id, existingOrgs[0].organizationId))
        .limit(1);
      return org;
    }

    // Create a default personal organization
    const orgId = crypto.randomUUID();
    const userSlug = ctx.session.user.email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-");
    const slug = `${userSlug}-${orgId.slice(0, 8)}`;

    const [newOrg] = await db
      .insert(organization)
      .values({
        id: orgId,
        name: `${ctx.session.user.name}'s Organization`,
        slug: slug,
      })
      .returning();

    // Add user as finance_admin (owner)
    await db.insert(organizationMember).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: ctx.session.user.id,
      role: "finance_admin",
    });

    return newOrg;
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
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
      .where(eq(organizationMember.userId, ctx.session.user.id));

    return memberships.map((m) => ({
      ...m.organization,
      role: m.membership.role,
    }));
  }),

  getCurrent: organizationProcedure.query(async ({ ctx }) => {
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, ctx.organizationId))
      .limit(1);

    if (!org) {
      throw new Error("Organization not found");
    }

    // Get members
    const members = await db
      .select({
        id: organizationMember.id,
        role: organizationMember.role,
        userId: organizationMember.userId,
      })
      .from(organizationMember)
      .where(eq(organizationMember.organizationId, ctx.organizationId));

    // Get user details for members
    const userIds = members.map((m) => m.userId);
    const users =
      userIds.length > 0
        ? await db.select().from(user).where(inArray(user.id, userIds))
        : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      ...org,
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        user: userMap.get(m.userId) || {
          id: m.userId,
          name: null,
          email: null,
        },
      })),
    };
  }),
});
