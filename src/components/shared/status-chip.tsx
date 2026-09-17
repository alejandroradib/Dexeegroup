import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type JobStatus = Database["public"]["Enums"]["job_status"];
type ApplicationStatus = Database["public"]["Enums"]["application_status"];
type CompanyStatus = Database["public"]["Enums"]["company_status"];
type AttemptStatus = Database["public"]["Enums"]["attempt_status"];

const JOB_COLORS: Record<JobStatus, string> = {
  draft: "bg-mist text-slate",
  pending_review: "bg-warning-soft text-warning",
  changes_requested: "bg-[#ffead5] text-[#b93815]",
  published: "bg-success-soft text-success",
  paused: "bg-[#e2e8f0] text-[#475569]",
  closed: "bg-[#f1f5f9] text-[#64748b]",
};

const APPLICATION_COLORS: Record<ApplicationStatus, string> = {
  applied: "bg-info-soft text-info",
  screening: "bg-[#e0e7ff] text-[#3730a3]",
  shortlisted: "bg-[#ede9fe] text-[#5b21b6]",
  interview: "bg-[#cffafe] text-[#155e75]",
  offer: "bg-[#ccfbf1] text-[#115e59]",
  hired: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
  withdrawn: "bg-mist text-slate",
};

const COMPANY_COLORS: Record<CompanyStatus, string> = {
  pending: "bg-warning-soft text-warning",
  verified: "bg-success-soft text-success",
  suspended: "bg-danger-soft text-danger",
};

const ATTEMPT_COLORS: Record<AttemptStatus, string> = {
  in_progress: "bg-info-soft text-info",
  submitted: "bg-[#e0e7ff] text-[#3730a3]",
  processing: "bg-[#e0e7ff] text-[#3730a3]",
  ai_scored: "bg-[#ede9fe] text-[#5b21b6]",
  pending_validation: "bg-warning-soft text-warning",
  validated: "bg-success-soft text-success",
  expired: "bg-mist text-slate",
  failed: "bg-danger-soft text-danger",
};

type StatusChipProps =
  | { kind: "job"; status: JobStatus; className?: string }
  | { kind: "application"; status: ApplicationStatus; className?: string }
  | { kind: "company"; status: CompanyStatus; className?: string }
  | { kind: "attempt"; status: AttemptStatus; className?: string };

export function StatusChip(props: StatusChipProps) {
  const t = useTranslations("enums");
  let color = "";
  let label = "";
  switch (props.kind) {
    case "job":
      color = JOB_COLORS[props.status];
      label = t(`job_status.${props.status}`);
      break;
    case "application":
      color = APPLICATION_COLORS[props.status];
      label = t(`application_status.${props.status}`);
      break;
    case "company":
      color = COMPANY_COLORS[props.status];
      label = t(`company_status.${props.status}`);
      break;
    case "attempt":
      color = ATTEMPT_COLORS[props.status];
      label = t(`attempt_status.${props.status}`);
      break;
  }
  return (
    <Badge variant="outline" className={cn("border-transparent", color, props.className)}>
      {label}
    </Badge>
  );
}
