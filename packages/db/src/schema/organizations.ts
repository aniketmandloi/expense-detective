import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const organization = pgTable("organization", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
});

export const organizationMember = pgTable("organization_member", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	role: text("role", {
		enum: ["employee", "manager", "finance_admin"],
	})
		.notNull()
		.default("employee"),
	createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
});

