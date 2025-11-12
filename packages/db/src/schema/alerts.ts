import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { expense } from "./expenses";
import { expensePolicy } from "./policies";
import { user } from "./auth";

export const expenseAlert = pgTable("expense_alert", {
	id: text("id").primaryKey(),
	expenseId: text("expense_id")
		.notNull()
		.references(() => expense.id, { onDelete: "cascade" }),
	policyId: text("policy_id").references(() => expensePolicy.id, {
		onDelete: "set null",
	}),
	// Alert type: policy_violation, anomaly_detected, suspicious_pattern
	alertType: text("alert_type", {
		enum: ["policy_violation", "anomaly_detected", "suspicious_pattern"],
	}).notNull(),
	severity: text("severity", {
		enum: ["low", "medium", "high", "critical"],
	}).notNull().default("medium"),
	title: text("title").notNull(),
	message: text("message").notNull(),
	// Additional data as JSON
	metadata: text("metadata"), // JSON string with alert-specific data
	// Anomaly score (0-100) for anomaly_detected type
	anomalyScore: integer("anomaly_score"),
	// Status
	status: text("status", {
		enum: ["open", "acknowledged", "resolved", "dismissed"],
	}).notNull().default("open"),
	acknowledgedAt: timestamp("acknowledged_at"),
	acknowledgedById: text("acknowledged_by_id").references(() => user.id, {
		onDelete: "set null",
	}),
	resolvedAt: timestamp("resolved_at"),
	resolvedById: text("resolved_by_id").references(() => user.id, {
		onDelete: "set null",
	}),
	createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
});

