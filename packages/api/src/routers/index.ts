import { protectedProcedure, publicProcedure, router } from "../index";
import { expensesRouter } from "./expenses";
import { policiesRouter } from "./policies";
import { alertsRouter } from "./alerts";
import { approvalsRouter } from "./approvals";
import { dashboardRouter } from "./dashboard";
import { organizationsRouter } from "./organizations";
import { reportsRouter } from "./reports";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  expenses: expensesRouter,
  policies: policiesRouter,
  alerts: alertsRouter,
  approvals: approvalsRouter,
  dashboard: dashboardRouter,
  organizations: organizationsRouter,
  reports: reportsRouter,
});
export type AppRouter = typeof appRouter;
