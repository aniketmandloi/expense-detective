# Expense Detective Implementation Plan

## Overview

Build an expense management platform that automatically flags suspicious spending for remote teams using computer vision, policy validation, and behavioral analysis. This plan follows a phased approach, starting with core MVP features and building up to advanced analytics.

## Tech Stack Context

- **Frontend**: Next.js with shadcn/ui components
- **Backend**: tRPC API layer
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Better-Auth (already configured)
- **Payments**: Polar (already integrated)
- **Monorepo**: Turborepo with pnpm workspaces

## Phase 1: Foundation & Core Schema

### 1.1 Database Schema Design

**Location**: `packages/db/src/schema/`

Create core database tables:

- **organizations** - Company/tenant management (multi-tenancy)
- **organization_members** - User-organization relationships with roles (employee, manager, finance_admin)
- **expenses** - Expense records with status (draft, submitted, approved, rejected, flagged)
- **receipts** - Receipt images and OCR data
- **expense_categories** - Categorization (meals, travel, software, etc.)
- **expense_policies** - Company spending policies and rules
- **expense_alerts** - Flagged suspicious expenses
- **expense_approvals** - Approval workflow tracking

**Key relationships**:

- Users belong to organizations via organization_members
- Expenses belong to users and organizations
- Receipts belong to expenses (one-to-one)
- Alerts reference expenses and policies

### 1.2 Multi-Tenancy Setup

**Location**: `packages/api/src/context.ts`, `packages/db/src/schema/`

- Extend tRPC context to include organization context
- Add organization middleware to protect routes
- Ensure data isolation between organizations

## Phase 2: Receipt Upload & Processing

### 2.1 File Upload Infrastructure

**Location**: `apps/web/src/app/api/upload/route.ts`, `packages/api/src/routers/expenses.ts`

- Implement file upload endpoint (Next.js API route)
- Store receipt images (local filesystem or cloud storage - S3/R2)
- Support common image formats (JPEG, PNG, PDF)
- Add file size limits and validation

### 2.2 OCR Integration

**Location**: `packages/api/src/lib/ocr.ts`, `packages/api/src/routers/expenses.ts`

- Integrate OCR service (AWS Textract, Google Vision API, or Tesseract.js for MVP)
- Extract key data: merchant name, date, amount, items
- Store OCR results in receipts table
- Handle OCR errors gracefully

### 2.3 Receipt Processing UI

**Location**: `apps/web/src/components/receipt-upload.tsx`, `apps/web/src/app/expenses/new/page.tsx`

- Drag-and-drop receipt upload component
- Receipt preview with OCR results display
- Manual correction interface for OCR errors
- Progress indicators for upload/processing

## Phase 3: Expense Management Core

### 3.1 Expense CRUD Operations

**Location**: `packages/api/src/routers/expenses.ts`

- Create expense with receipt attachment
- List expenses (with filtering by status, date, category)
- Update expense details
- Delete draft expenses
- Submit expense for approval

### 3.2 Expense Submission Workflow

**Location**: `apps/web/src/app/expenses/`, `packages/api/src/routers/expenses.ts`

- Expense form with fields: amount, date, category, merchant, description
- Receipt attachment and OCR data population
- Submit action that triggers policy validation
- Status tracking (draft → submitted → approved/rejected)

### 3.3 Expense List & Detail Views

**Location**: `apps/web/src/app/expenses/page.tsx`, `apps/web/src/app/expenses/[id]/page.tsx`

- Employee expense list with filters
- Expense detail view with receipt image
- Status badges and workflow indicators

## Phase 4: Policy Engine

### 4.1 Policy Schema & Management

**Location**: `packages/db/src/schema/policies.ts`, `packages/api/src/routers/policies.ts`

- Policy types: amount limits, category restrictions, time-based rules, merchant blacklists
- Policy CRUD operations (admin only)
- Policy assignment to users/roles/organizations

### 4.2 Policy Validation Service

**Location**: `packages/api/src/lib/policy-engine.ts`

- Rule evaluation engine
- Validate expenses against active policies
- Return violations with severity levels
- Support for complex rules (e.g., "lunch > $50 requires approval", "no expenses after 10 PM")

### 4.3 Policy Management UI

**Location**: `apps/web/src/app/policies/`, `apps/web/src/components/policy-form.tsx`

- Policy creation/editing interface (admin only)
- Policy list with status indicators
- Policy testing interface

## Phase 5: Behavioral Analysis & Anomaly Detection

### 5.1 Spending Pattern Analysis

**Location**: `packages/api/src/lib/behavioral-analysis.ts`

- Calculate baseline spending patterns per user (average amounts, typical categories, time patterns)
- Store historical spending data
- Identify deviations from baseline

### 5.2 Anomaly Detection Algorithm

**Location**: `packages/api/src/lib/anomaly-detector.ts`

- Flag expenses that deviate significantly from user's normal patterns
- Consider: amount outliers, unusual categories, off-hours spending, location anomalies
- Generate anomaly scores (0-100)

### 5.3 Alert Generation

**Location**: `packages/api/src/routers/alerts.ts`, `packages/db/src/schema/alerts.ts`

- Auto-create alerts for policy violations and anomalies
- Alert types: policy_violation, anomaly_detected, suspicious_pattern
- Alert severity levels: low, medium, high, critical

## Phase 6: Approval Workflow

### 6.1 Manager Dashboard

**Location**: `apps/web/src/app/manager/`, `packages/api/src/routers/approvals.ts`

- Pending approvals list
- Expense review interface with policy violations highlighted
- Approve/reject actions with comments
- Bulk approval capabilities

### 6.2 Approval Notifications

**Location**: `packages/api/src/lib/notifications.ts`

- Email notifications for approval requests
- In-app notification system
- Status change notifications to employees

## Phase 7: Dashboards & Analytics

### 7.1 Employee Dashboard

**Location**: `apps/web/src/app/dashboard/employee.tsx`

- Recent expenses summary
- Pending approvals status
- Spending trends (charts)
- Quick expense submission

### 7.2 Manager Dashboard

**Location**: `apps/web/src/app/dashboard/manager.tsx`

- Team spending overview
- Pending approvals count
- Alerts summary
- Spending by category/team member

### 7.3 Finance Admin Dashboard

**Location**: `apps/web/src/app/dashboard/admin.tsx`

- Organization-wide spending analytics
- All alerts and flagged expenses
- Policy effectiveness metrics
- Export capabilities (CSV, PDF reports)

## Phase 8: Advanced Features

### 8.1 Organization Setup

**Location**: `apps/web/src/app/settings/organization/`, `packages/api/src/routers/organizations.ts`

- Organization creation/management
- Team member invitation system
- Role management interface
- Billing integration (Polar subscriptions)

### 8.2 Search & Filtering

**Location**: `packages/api/src/routers/expenses.ts`, `apps/web/src/components/expense-filters.tsx`

- Advanced filtering (date range, category, status, amount range, merchant)
- Full-text search across expenses
- Saved filter presets

### 8.3 Reporting & Exports

**Location**: `packages/api/src/routers/reports.ts`, `apps/web/src/app/reports/`

- Generate expense reports (monthly, quarterly, custom)
- Export to CSV/PDF
- Scheduled report emails

## Phase 9: UI/UX Polish

### 9.1 Responsive Design

- Mobile-optimized views (responsive, not native app)
- Touch-friendly interactions
- Optimized image loading for receipts

### 9.2 Error Handling & Loading States

- Comprehensive error boundaries
- Loading skeletons
- User-friendly error messages
- Retry mechanisms for failed operations

### 9.3 Accessibility

- ARIA labels and roles
- Keyboard navigation
- Screen reader support
- Color contrast compliance

## Implementation Order

**Sprint 1**: Phases 1-2 (Foundation + Receipt Processing)
**Sprint 2**: Phase 3 (Expense Management Core)
**Sprint 3**: Phase 4 (Policy Engine)
**Sprint 4**: Phase 5 (Behavioral Analysis)
**Sprint 5**: Phase 6 (Approval Workflow)
**Sprint 6**: Phase 7 (Dashboards)
**Sprint 7**: Phase 8 (Advanced Features)
**Sprint 8**: Phase 9 (Polish)

## Key Technical Decisions

1. **OCR Service**: Start with Tesseract.js for MVP, plan for cloud service integration (AWS Textract/Google Vision) later
2. **File Storage**: Local filesystem for MVP, migrate to S3/R2 for production
3. **Anomaly Detection**: Rule-based initially, ML-based later
4. **Real-time Updates**: Polling for MVP, WebSockets/SSE later
5. **Multi-tenancy**: Row-level security via organization_id foreign keys

## Dependencies to Add

- File upload: `formidable` or `@uploadthing/react`
- OCR: `tesseract.js` (MVP) or AWS SDK for Textract
- Charts: `recharts` or `@tanstack/react-charts`
- Date handling: `date-fns` or `dayjs`
- PDF generation: `pdfkit` or `jspdf`
- CSV export: `papaparse`

## Implementation Todos

1. **Phase 1 - Schema**: Create database schema for organizations, expenses, receipts, policies, alerts, and approval workflow tables in `packages/db/src/schema/`
2. **Phase 1 - Multi-tenancy**: Implement multi-tenancy support in tRPC context and add organization middleware
3. **Phase 2 - Upload**: Build file upload infrastructure for receipt images with validation and storage
4. **Phase 2 - OCR**: Integrate OCR service (Tesseract.js for MVP) to extract receipt data and store results
5. **Phase 2 - Receipt UI**: Create receipt upload UI component with drag-and-drop, preview, and OCR result display
6. **Phase 3 - Expense CRUD**: Implement expense CRUD operations in tRPC router with filtering and status management
7. **Phase 3 - Expense UI**: Build expense submission form and list/detail views with receipt integration
8. **Phase 4 - Policy Engine**: Create policy engine with rule evaluation, policy CRUD operations, and validation service
9. **Phase 4 - Policy UI**: Build policy management UI for admins to create/edit policies and test rules
10. **Phase 5 - Behavioral Analysis**: Implement behavioral analysis service to calculate spending patterns and detect anomalies
11. **Phase 5 - Alerts**: Create alert generation system for policy violations and anomalies with severity levels
12. **Phase 6 - Approval**: Build approval workflow with manager dashboard, review interface, and notification system
13. **Phase 7 - Dashboards**: Create role-based dashboards (employee, manager, admin) with analytics and charts
14. **Phase 8 - Org Setup**: Implement organization setup, team invitations, role management, and billing integration
15. **Phase 8 - Reports**: Add reporting and export functionality with CSV/PDF generation and scheduled emails
16. **Phase 9 - Polish**: Polish UI/UX with responsive design, error handling, loading states, and accessibility improvements
