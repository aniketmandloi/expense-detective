import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { expense } from "./expenses";
import { user } from "./auth";

export const expenseApproval = pgTable("expense_approval", {
	id: text("id").primaryKey(),
	expenseId: text("expense_id")
		.notNull()
		.references(() => expense.id, { onDelete: "cascade" }),
	requestedById: text("requested_by_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	approverId: text("approver_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	// Status: pending, approved, rejected
	status: text("status", {
		enum: ["pending", "approved", "rejected"],
	}).notNull().default("pending"),
	comments: text("comments"),
	approvedAt: timestamp("approved_at"),
	rejectedAt: timestamp("rejected_at"),
	createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
});

