"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import ReceiptUpload from "@/components/receipt-upload";
import { trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const expenseSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("USD"),
  merchant: z.string().optional(),
  description: z.string().optional(),
  expenseDate: z.string().min(1, "Date is required"),
});

type ReceiptFile = {
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
};

export default function NewExpensePage() {
  const router = useRouter();
  const [receiptFile, setReceiptFile] = useState<ReceiptFile | null>(null);

  const createExpense = useMutation(
    trpc.expenses.create.mutationOptions({
      onSuccess: () => {
        router.push("/expenses");
      },
      onError: (error) => {
        alert(`Failed to create expense: ${error.message}`);
      },
    })
  );

  const form = useForm({
    defaultValues: {
      amount: "",
      currency: "USD",
      merchant: "",
      description: "",
      expenseDate: new Date().toISOString().split("T")[0],
    },
    onSubmit: async ({ value }) => {
      await createExpense.mutateAsync({
        amount: parseFloat(value.amount),
        currency: value.currency,
        merchant: value.merchant || undefined,
        description: value.description || undefined,
        expenseDate: new Date(value.expenseDate),
        receiptFileUrl: receiptFile?.fileUrl,
        receiptFileName: receiptFile?.fileName,
        receiptFileSize: receiptFile?.fileSize,
        receiptMimeType: receiptFile?.mimeType,
      });
    },
  });

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">New Expense</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Receipt</h2>
            <ReceiptUpload
              onFileUploaded={(file) => {
                setReceiptFile({
                  fileUrl: file.fileUrl,
                  fileName: file.fileName,
                  fileSize: file.fileSize,
                  mimeType: file.mimeType,
                });
              }}
            />
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Expense Details</h2>
            <div className="space-y-4">
              <form.Field
                name="amount"
                validators={{
                  onChange: ({ value }) => {
                    const num = parseFloat(value);
                    if (isNaN(num) || num <= 0) {
                      return "Amount must be a positive number";
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div>
                    <Label htmlFor={field.name}>Amount *</Label>
                    <Input
                      id={field.name}
                      type="number"
                      step="0.01"
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(
                          e.target.value ? parseFloat(e.target.value) : ""
                        )
                      }
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors && (
                      <p className="text-sm text-destructive mt-1">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="currency">
                {(field) => (
                  <div>
                    <Label htmlFor={field.name}>Currency</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="merchant">
                {(field) => (
                  <div>
                    <Label htmlFor={field.name}>Merchant</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="expenseDate">
                {(field) => (
                  <div>
                    <Label htmlFor={field.name}>Date *</Label>
                    <Input
                      id={field.name}
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors && (
                      <p className="text-sm text-destructive mt-1">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="description">
                {(field) => (
                  <div>
                    <Label htmlFor={field.name}>Description</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </Card>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createExpense.isPending}>
              {createExpense.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save as Draft
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
