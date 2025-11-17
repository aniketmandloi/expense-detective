"use client";

import { use } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import Image from "next/image";
import { Loader2, ArrowLeft, Receipt as ReceiptIcon } from "lucide-react";
import Link from "next/link";

export default function ExpenseDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const router = useRouter();
	const { id } = use(params);
	const expenseQuery = useQuery(trpc.expenses.getById.queryOptions({ id }));
	const submitExpense = useMutation(trpc.expenses.submit.mutationOptions({
		onSuccess: () => {
			expenseQuery.refetch();
		},
	}));

	const statusColors = {
		draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
		submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
		approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
		rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
		flagged: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
	};

	if (expenseQuery.isLoading) {
		return (
			<div className="container mx-auto py-8 px-4 max-w-4xl">
				<Skeleton className="h-8 w-48 mb-6" />
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<Card className="p-6">
						<Skeleton className="h-6 w-32 mb-4" />
						<div className="space-y-3">
							{[1, 2, 3, 4].map((i) => (
								<Skeleton key={i} className="h-4 w-full" />
							))}
						</div>
					</Card>
				</div>
			</div>
		);
	}

	if (expenseQuery.isError || !expenseQuery.data) {
		return (
			<div className="container mx-auto py-8 px-4 max-w-4xl">
				<Card className="p-6">
					<p className="text-destructive text-center">
						Error loading expense: {expenseQuery.error?.message || "Not found"}
					</p>
				</Card>
			</div>
		);
	}

	const expense = expenseQuery.data;
	const receipt = expense.receipt;

	return (
		<div className="container mx-auto py-8 px-4 max-w-4xl">
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="icon" onClick={() => router.back()}>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<h1 className="text-3xl font-bold">Expense Details</h1>
				</div>
				<Button variant="outline" asChild>
					<Link href="/expenses">View All Expenses</Link>
				</Button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Card className="p-6">
					<h2 className="text-xl font-semibold mb-4">Expense Information</h2>
					<div className="space-y-4">
						<div>
							<p className="text-sm font-medium text-muted-foreground mb-1">Amount</p>
							<p className="text-2xl font-bold">
								{formatCurrency(parseFloat(expense.amount), expense.currency)}
							</p>
						</div>
						<div>
							<p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
							<Badge className={statusColors[expense.status] || statusColors.draft}>
								{expense.status}
							</Badge>
						</div>
						<div>
							<p className="text-sm font-medium text-muted-foreground mb-1">Merchant</p>
							<p className="text-base">{expense.merchant || "N/A"}</p>
						</div>
						<div>
							<p className="text-sm font-medium text-muted-foreground mb-1">Date</p>
							<p className="text-base">{formatDate(expense.expenseDate)}</p>
						</div>
						{expense.description && (
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
								<p className="text-base">{expense.description}</p>
							</div>
						)}
						{expense.submittedAt && (
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-1">Submitted</p>
								<p className="text-base">{formatDate(expense.submittedAt)}</p>
							</div>
						)}
						{expense.approvedAt && (
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-1">Approved</p>
								<p className="text-base">{formatDate(expense.approvedAt)}</p>
							</div>
						)}
					</div>

					{expense.status === "draft" && (
						<div className="mt-6">
							<Button
								onClick={() => submitExpense.mutate({ id: expense.id })}
								disabled={submitExpense.isPending}
								className="w-full"
							>
								{submitExpense.isPending && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								Submit for Approval
							</Button>
						</div>
					)}
				</Card>

				{receipt ? (
					<Card className="p-6">
						<div className="flex items-center gap-2 mb-4">
							<ReceiptIcon className="h-5 w-5" />
							<h2 className="text-xl font-semibold">Receipt</h2>
						</div>
						{receipt.fileUrl && receipt.mimeType?.startsWith("image/") && (
							<div className="relative w-full mb-4 rounded-lg overflow-hidden border bg-muted">
								<Image
									src={receipt.fileUrl}
									alt="Receipt"
									width={800}
									height={600}
									className="object-contain w-full h-auto"
								/>
							</div>
						)}
						{receipt.ocrProcessed && receipt.ocrData && (
							<div className="space-y-3 pt-4 border-t">
								<p className="text-sm text-muted-foreground">
									OCR processed: {receipt.ocrProcessedAt ? formatDate(receipt.ocrProcessedAt) : "N/A"}
								</p>
								{receipt.merchantName && (
									<div>
										<p className="text-sm font-medium text-muted-foreground mb-1">Merchant</p>
										<p className="text-base">{receipt.merchantName}</p>
									</div>
								)}
								{receipt.totalAmount && (
									<div>
										<p className="text-sm font-medium text-muted-foreground mb-1">Total</p>
										<p className="text-base font-semibold">
											{formatCurrency(parseFloat(receipt.totalAmount), expense.currency)}
										</p>
									</div>
								)}
							</div>
						)}
					</Card>
				) : (
					<Card className="p-6">
						<div className="text-center py-8 text-muted-foreground">
							<ReceiptIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
							<p>No receipt attached</p>
						</div>
					</Card>
				)}
			</div>
		</div>
	);
}

