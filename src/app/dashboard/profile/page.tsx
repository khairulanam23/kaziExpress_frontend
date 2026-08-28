"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Banknote,
  CalendarCheck,
  Clock,
  Download,
  FileText,
  Loader2,
  LogIn,
  LogOut,
  Wallet,
} from "lucide-react";
import { ChartCard, SectionHeader } from "@/components/shared/chart-card";
import { StatCard } from "@/components/shared/stat-card";
import { CardGridSkeleton, ErrorState, LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonthPicker, currentPeriod, type Period } from "@/components/shared/period-picker";
import { DocumentsSection } from "@/features/profile/documents-section";
import { DynamicRecordCard, IncompleteFieldsAlert } from "@/features/profile/dynamic-records";
import { OrganizationSection } from "@/features/profile/organization-section";
import { PersonalDetailsForm } from "@/features/profile/personal-details-form";
import { ProfileHeader } from "@/features/profile/profile-header";
import { useMyDocuments, useMyProfile } from "@/hooks/queries/use-profile";
import { useCheckIn, useCheckOut, useTodayStatus } from "@/hooks/queries/use-attendance";
import { useEmployeePerformance, useDownloadReport, useMyRecords } from "@/hooks/queries/use-content-types";
import { useMyEarnings } from "@/hooks/queries/use-users";
import { useAuthStore } from "@/store/auth-store";
import { getApiErrorMessage } from "@/lib/api-client";
import { liveWorkedHours, num, overtimeHours, percent } from "@/lib/calc";
import { formatCurrency, formatHours, formatMoney, formatPercent, formatTime } from "@/lib/utils";

/** Today's clock, shown to employees on their own profile. */
function TodayAttendanceCard() {
  const { data: today, isLoading } = useTodayStatus();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!today?.checkedIn || today?.checkedOut) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [today]);

  const worked = React.useMemo(() => {
    if (!today?.checkIn) return 0;
    if (today.checkOut) return num(today.workedHours);
    void now;
    return liveWorkedHours(today.checkIn, null);
  }, [today, now]);

  const required = num(today?.requiredHours, 8);
  const overtime = overtimeHours(worked, required);

  return (
    <Card className="h-full flex flex-col justify-between min-w-0">
      <div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="text-primary size-4 shrink-0" />
            Today&apos;s attendance
          </CardTitle>
          <CardDescription>
            {today?.checkedOut ? "Your shift is complete." : today?.checkedIn ? "You're clocked in." : "Not checked in yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            <Skeleton className="h-28 w-full rounded-xl" />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/40 flex flex-col gap-0.5 rounded-xl p-2.5 min-w-0">
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <LogIn className="size-3 shrink-0" /> <span className="truncate">In</span>
                  </span>
                  <span className="tabular text-sm font-semibold truncate">{today?.checkIn ? formatTime(today.checkIn) : "—"}</span>
                </div>
                <div className="bg-muted/40 flex flex-col gap-0.5 rounded-xl p-2.5 min-w-0">
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <LogOut className="size-3 shrink-0" /> <span className="truncate">Out</span>
                  </span>
                  <span className="tabular text-sm font-semibold truncate">{today?.checkOut ? formatTime(today.checkOut) : "—"}</span>
                </div>
                <div className="bg-muted/40 flex flex-col gap-0.5 rounded-xl p-2.5 min-w-0">
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Clock className="size-3 shrink-0" /> <span className="truncate">Worked</span>
                  </span>
                  <span className="tabular text-sm font-semibold truncate">{formatHours(worked)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Progress value={percent(worked, required)} />
                <div className="text-muted-foreground flex justify-between text-xs">
                  <span>{formatHours(required)} required</span>
                  {overtime > 0 && (
                    <span className="text-warning font-medium">
                      {formatHours(overtime)}
                      {" overtime"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={!!today?.checkedIn || checkIn.isPending}
                  onClick={() =>
                    checkIn.mutate(undefined, {
                      onSuccess: () => toast.success("Checked in"),
                      onError: (e) => toast.error("Couldn't check in", { description: getApiErrorMessage(e) }),
                    })
                  }
                >
                  {checkIn.isPending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                  Check in
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={!today?.checkedIn || !!today?.checkedOut || checkOut.isPending}
                  onClick={() =>
                    checkOut.mutate(undefined, {
                      onSuccess: (r) => toast.success("Checked out", { description: `${formatHours(r.workedHours)} worked.` }),
                      onError: (e) => toast.error("Couldn't check out", { description: getApiErrorMessage(e) }),
                    })
                  }
                >
                  {checkOut.isPending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                  Check out
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </div>
    </Card>
  );
}

/** Personal performance summary with a downloadable monthly report. */
function PerformanceCard({ userId }: { userId: string }) {
  const [period, setPeriod] = React.useState<Period>(currentPeriod);
  const { data, isLoading } = useEmployeePerformance(userId, period.year, period.month);
  const download = useDownloadReport();

  return (
    <ChartCard
      title="My performance"
      description="Tasks, attendance and estimated earnings for the selected month."
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <MonthPicker value={period} onChange={setPeriod} />
          <Button
            variant="outline"
            size="sm"
            disabled={download.isPending}
            onClick={() =>
              download.mutate(
                { userId, year: period.year, month: period.month },
                {
                  onSuccess: () => toast.success("Report downloaded"),
                  onError: (e) => toast.error("Couldn't download report", { description: getApiErrorMessage(e) }),
                },
              )
            }
          >
            {download.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            <span className="hidden sm:inline">Report</span>
          </Button>
        </div>
      }
    >
      {isLoading && !data ? (
        <CardGridSkeleton count={4} className="xl:grid-cols-4" />
      ) : !data ? (
        <p className="text-muted-foreground text-sm">No performance data for this period.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Tasks completed"
            value={`${data.tasks.completed}/${data.tasks.assigned}`}
            icon={FileText}
            accent="primary"
            helper={`${formatPercent(data.tasks.completionRate)} completion rate`}
          />
          <StatCard
            label="Days worked"
            value={String(data.attendance.daysWorked)}
            icon={CalendarCheck}
            accent="secondary"
            helper={`${formatHours(data.attendance.totalHours)} total`}
          />
          <StatCard
            label="Overtime"
            value={formatHours(data.attendance.overtimeHours)}
            icon={Clock}
            accent="accent"
            helper="Recorded this period"
          />
          <StatCard
            label="Estimated earnings"
            value={formatCurrency(data.earnings.totalEstimatedPay)}
            icon={Wallet}
            accent="success"
            helper={`${formatMoney(data.earnings.hourlyRate)}/hr base rate`}
          />
        </div>
      )}
    </ChartCard>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";

  const { data: profile, isLoading, isError, error, refetch } = useMyProfile();
  const { data: documents = [], isLoading: docsLoading, isError: docsError, error: docsErrorObj, refetch: refetchDocs } =
    useMyDocuments();
  const { data: earnings } = useMyEarnings();
  const { data: records } = useMyRecords();

  // Section nodes are registered by a callback ref as they mount, so nothing
  // is written to the ref map during render.
  const sectionNodes = React.useRef(new Map<string, HTMLDivElement>());
  const registerSection = React.useCallback(
    (contentTypeId: string) => (node: HTMLDivElement | null) => {
      if (node) sectionNodes.current.set(contentTypeId, node);
      else sectionNodes.current.delete(contentTypeId);
    },
    [],
  );
  const scrollToSection = (contentTypeId: string) =>
    sectionNodes.current.get(contentTypeId)?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHeader title="Profile" description="Your account, personal details and legal documents." />
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  if (isLoading || !profile) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHeader title="Profile" description="Your account, personal details and legal documents." />
        <Skeleton className="h-52 w-full rounded-2xl" />
        <LoadingState label="Loading your profile…" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Profile"
        description={
          isAdmin
            ? "Your account, legal documents and the organisation's business details."
            : "Your account, personal details and legal documents."
        }
      />

      <ProfileHeader profile={profile} />

      {!isAdmin && records && records.length > 0 && (
        <IncompleteFieldsAlert groups={records} onScrollTo={scrollToSection} />
      )}

      <Tabs defaultValue="details">
        <TabsList className="flex-wrap">
          <TabsTrigger value="details">Personal details</TabsTrigger>
          <TabsTrigger value="documents">
            Documents
            {documents.length > 0 && <span className="text-muted-foreground ml-1.5 text-xs">{documents.length}</span>}
          </TabsTrigger>
          {!isAdmin && <TabsTrigger value="work">Work & pay</TabsTrigger>}
          {!isAdmin && records && records.length > 0 && <TabsTrigger value="records">Additional records</TabsTrigger>}
          {isAdmin && <TabsTrigger value="organisation">Organisation</TabsTrigger>}
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <PersonalDetailsForm profile={profile} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsSection
            documents={documents}
            isLoading={docsLoading}
            isError={docsError}
            error={docsErrorObj}
            onRetry={() => refetchDocs()}
            description={
              isAdmin
                ? "Your personal identification and the organisation's business paperwork. Stored privately — never exposed as public files."
                : "Identity and legal paperwork. Stored privately — only you and an administrator can open these."
            }
          />
        </TabsContent>

        {!isAdmin && (
          <TabsContent value="work" className="mt-4">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <TodayAttendanceCard />

                <ChartCard
                  title="Earnings this month"
                  description="Estimated from your attendance — payroll remains authoritative."
                  className="lg:col-span-2"
                >
                  {!earnings ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4 sm:gap-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-2xl" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4 sm:gap-4">
                      <StatCard
                        label="Days worked"
                        value={String(earnings.daysWorked)}
                        icon={CalendarCheck}
                        accent="primary"
                        helper={`${formatHours(earnings.regularHours)} regular`}
                      />
                      <StatCard
                        label="Overtime hours"
                        value={formatHours(earnings.overtimeHours)}
                        icon={Clock}
                        accent="warning"
                        helper="Subject to approval"
                      />
                      <StatCard
                        label="Regular pay"
                        value={formatCurrency(earnings.regularPay)}
                        icon={Banknote}
                        accent="secondary"
                      />
                      <StatCard
                        label="Estimated total"
                        value={formatCurrency(earnings.totalEstimatedPay)}
                        icon={Wallet}
                        accent="success"
                        helper={`incl. ${formatCurrency(earnings.overtimePay)} overtime`}
                      />
                    </div>
                  )}
                </ChartCard>
              </div>

              {user?.id && <PerformanceCard userId={user.id} />}
            </div>
          </TabsContent>
        )}

        {!isAdmin && records && records.length > 0 && (
          <TabsContent value="records" className="mt-4">
            <div className="flex flex-col gap-4">
              {records.map((group) => (
                <div key={group.contentType.id} ref={registerSection(group.contentType.id)}>
                  <DynamicRecordCard group={group} />
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="organisation" className="mt-4">
            <OrganizationSection />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
