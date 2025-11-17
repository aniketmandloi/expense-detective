"use client";

import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Users, Shield, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function OrganizationSettingsPage() {
  const orgQuery = useQuery(trpc.organizations.getCurrent.queryOptions());

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Organization Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization's settings and team members
        </p>
      </div>

      {orgQuery.isLoading ? (
        <div className="space-y-4">
          <Card className="p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-10 w-full" />
          </Card>
        </div>
      ) : orgQuery.isError ? (
        <Card className="p-6">
          <p className="text-destructive">
            Error loading organization: {orgQuery.error.message}
          </p>
        </Card>
      ) : orgQuery.data ? (
        <div className="space-y-6">
          {/* Organization Info */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Organization Details</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={orgQuery.data.name}
                  disabled
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="id">Organization ID</Label>
                <Input
                  id="id"
                  value={orgQuery.data.id}
                  disabled
                  className="mt-1 font-mono text-sm"
                />
              </div>
            </div>
          </Card>

          {/* Team Members */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold">Team Members</h2>
              </div>
              <Button variant="outline" size="sm">
                Invite Member
              </Button>
            </div>
            <div className="space-y-2">
              {orgQuery.data.members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">
                      {member.user.name || member.user.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                  <Badge>{member.role}</Badge>
                </div>
              )) || (
                <p className="text-muted-foreground text-center py-4">
                  No team members found
                </p>
              )}
            </div>
          </Card>

          {/* Policies */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold">Policies</h2>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/policies">Manage Policies</a>
              </Button>
            </div>
            <p className="text-muted-foreground">
              Configure spending policies and rules for your organization.
            </p>
          </Card>

          {/* Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Settings</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Billing</p>
                  <p className="text-sm text-muted-foreground">
                    Manage your subscription and billing
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Manage Billing
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
