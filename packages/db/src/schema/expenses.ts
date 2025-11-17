import { pgTable, text, timestamp, decimal, integer, boolean } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organizations";

export const expenseCategory = pgTable("expense_category", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description"),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
});

export const expense = pgTable("expense", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
	currency: text("currency").notNull().default("USD"),
	categoryId: text("category_id").references(() => expenseCategory.id, {
		onDelete: "set null",
	}),
	merchant: text("merchant"),
	description: text("description"),
	expenseDate: timestamp("expense_date").notNull(),
	status: text("status", {
		enum: ["draft", "submitted", "approved", "rejected", "flagged"],
	})
		.notNull()
		.default("draft"),
	submittedAt: timestamp("submitted_at"),
	approvedAt: timestamp("approved_at"),
	rejectedAt: timestamp("rejected_at"),
	approvedById: text("approved_by_id").references(() => user.id, {
		onDelete: "set null",
	}),
	rejectionReason: text("rejection_reason"),
	createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
});

export const receipt = pgTable("receipt", {
	id: text("id").primaryKey(),
	expenseId: text("expense_id")
		.notNull()
		.unique()
		.references(() => expense.id, { onDelete: "cascade" }),
	fileUrl: text("file_url").notNull(),
	fileName: text("file_name").notNull(),
	fileSize: integer("file_size"),
	mimeType: text("mime_type"),
	// OCR extracted data
	ocrData: text("ocr_data"), // JSON string of extracted data
	merchantName: text("merchant_name"),
	merchantAddress: text("merchant_address"),
	transactionDate: timestamp("transaction_date"),
	items: text("items"), // JSON array of line items
	totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
	taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }),
	ocrProcessed: boolean("ocr_processed").notNull().default(false),
	ocrProcessedAt: timestamp("ocr_processed_at"),
	createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
});

