"use client";
import { trpc } from "@/utils/trpc";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  const healthCheck = trpc.healthCheck.useQuery();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto max-w-4xl px-6 py-16">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight">
            Expense Detective
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Intelligent expense tracking and management for your organization
          </p>
        </div>

        <div className="grid gap-6 mb-8">
          <Card className="p-8 border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold tracking-tight">
                System Status
              </h2>
              {healthCheck.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : healthCheck.data ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div
                  className={`h-3 w-3 rounded-full ${
                    healthCheck.data
                      ? "bg-primary"
                      : healthCheck.isLoading
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-destructive"
                  }`}
                />
                <span className="text-base text-muted-foreground">
                  {healthCheck.isLoading
                    ? "Checking connection..."
                    : healthCheck.data
                    ? "API Connected"
                    : "API Disconnected"}
                </span>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/login">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
