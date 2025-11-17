import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { getUserOrganizationMembership } from "./lib/organizations";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No session",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const organizationProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    if (!ctx.organizationId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Organization ID is required",
      });
    }

    if (!ctx.session?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    // Verify user is a member of the organization
    const membership = await getUserOrganizationMembership(
      ctx.session.user.id,
      ctx.organizationId
    );

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a member of this organization",
      });
    }

    return next({
      ctx: {
        ...ctx,
        organizationId: ctx.organizationId,
        membership,
      },
    });
  }
);
