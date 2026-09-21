"use server";

import { getSessionUser } from "@/lib/auth/session";
import { getCurrentCompany } from "@/server/services/companies";
import { getApplicantDetail, type ApplicantDetail } from "@/server/services/jobs";
import { ERR, err, ok, type Result } from "@/server/services/result";
import { getVisibleWorkstyleBands } from "@/server/services/workstyle";

/** Loads a single applicant for the drawer. RLS guarantees contact data only comes back when released. */
export async function fetchApplicantDetail(
  applicationId: string,
): Promise<Result<ApplicantDetail>> {
  const user = await getSessionUser();
  if (!user || user.role !== "company") return err(ERR.unauthorized);
  const company = await getCurrentCompany();
  if (!company) return err(ERR.notFound);
  const detail = await getApplicantDetail(applicationId, company.id);
  if (!detail) return err(ERR.notFound);
  // No card means RLS hid the candidate (dexee_only); nothing about them leaves the server.
  const workstyleBands = detail.card
    ? await getVisibleWorkstyleBands(detail.application.candidate_id)
    : null;
  return ok({ ...detail, workstyleBands });
}
