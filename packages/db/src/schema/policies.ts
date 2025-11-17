import { pgTable, text, timestamp, decimal, boolean, integer } from "drizzle-orm/pg-core";
import { organization } from "./organizations";
import { expenseCategory } from "./expenses";

export const expensePolicy = pgTable("expense_policy", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description"),
	// Policy type: amount_limit, category_restriction, time_based, merchant_blacklist
	policyType: text("policy_type", {
		enum: ["amount_limit", "category_restriction", "time_based", "merchant_blacklist"],
	}).notNull(),
	// Policy configuration as JSON
	config: text("config").notNull(), // JSON string with policy-specific rules
	// For amount_limit: { maxAmount: 100, requiresApproval: true }
	// For category_restriction: { allowedCategories: [], blockedCategories: [] }
	// For time_based: { allowedHours: { start: 8, end: 20 }, blockedDays: [] }
	// For merchant_blacklist: { blockedMerchants: [] }
	// Target: all, role, user
	targetType: text("target_type", {
		enum: ["all", "role", "user"],
	}).notNull().default("all"),
	targetRole: text("target_role", {
		enum: ["employee", "manager", "finance_admin"],
	}),
	targetUserId: text("target_user_id"),
	// Category restrictions
	categoryId: text("category_id").references(() => expenseCategory.id, {
		onDelete: "set null",
	}),
	// Severity when violated
	severity: text("severity", {
		enum: ["low", "medium", "high", "critical"],
	}).notNull().default("medium"),
	// Action when violated
	action: text("action", {
		enum: ["flag", "require_approval", "auto_reject"],
	}).notNull().default("flag"),
	active: boolean("active").notNull().default(true),
	createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
});

