"use client";

import { DownloadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { TagInput } from "@/components/shared/tag-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import {
  addDexeeNote,
  getCandidateResumeUrlAdmin,
  recommendCandidate,
  resolveDataRequest,
  updateCandidateTags,
} from "@/server/actions/admin";

export function CandidateTagsEditor({
  candidateId,
  tags,
}: {
  candidateId: string;
  tags: string[];
}) {
  const t = useTranslations("admin.candidates.detail");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = useState(tags);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2">
      <TagInput value={value} onChange={setValue} removeLabel={tc("actions.remove")} />
      <p className="text-muted-foreground text-xs">{t("tagsHint")}</p>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        className="justify-self-start"
        onClick={() =>
          start(async () => {
            const r = await updateCandidateTags({ candidate_id: candidateId, tags: value });
            toast({
              title: r.ok ? t("tagsSaved") : tc("errors.generic"),
              variant: r.ok ? "success" : "danger",
            });
            router.refresh();
          })
        }
      >
        {tc("actions.save")}
      </Button>
    </div>
  );
}

export function DexeeNoteForm({ candidateId }: { candidateId: string }) {
  const t = useTranslations("admin.candidates.detail");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        start(async () => {
          const r = await addDexeeNote({ candidate_id: candidateId, body });
          toast({
            title: r.ok ? t("noteSaved") : tc("errors.generic"),
            variant: r.ok ? "success" : "danger",
          });
          setBody("");
          router.refresh();
        });
      }}
    >
      <Label htmlFor="dexee_note" className="sr-only">
        {t("addNote")}
      </Label>
      <Textarea
        id="dexee_note"
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending || !body.trim()}
        className="justify-self-end"
      >
        {t("addNote")}
      </Button>
    </form>
  );
}

export function ResumeDownloadButton({ candidateId }: { candidateId: string }) {
  const t = useTranslations("admin.candidates.detail");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await getCandidateResumeUrlAdmin(candidateId);
          if (r.ok) window.open(r.data.url, "_blank", "noopener");
          else toast({ title: tc("errors.generic"), variant: "danger" });
        })
      }
    >
      <DownloadIcon /> {t("resume")}
    </Button>
  );
}

export function RecommendDialog({
  candidateId,
  jobs,
}: {
  candidateId: string;
  jobs: { id: string; title: string; company: string }[];
}) {
  const t = useTranslations("admin.candidates.detail");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="accent" size="sm" onClick={() => setOpen(true)} disabled={jobs.length === 0}>
        {t("recommend")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={tc("actions.close")}>
          <DialogHeader>
            <DialogTitle>{t("recommend")}</DialogTitle>
            <DialogDescription>{t("recommendBody")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="recommend_job">{t("chooseJob")}</Label>
            <select
              id="recommend_job"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="border-input h-10 rounded-[10px] border px-3 text-sm"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} · {j.company}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button
              variant="accent"
              disabled={pending || !jobId}
              onClick={() =>
                start(async () => {
                  const r = await recommendCandidate({ candidate_id: candidateId, job_id: jobId });
                  toast({
                    title: r.ok
                      ? t("recommended")
                      : r.error === "duplicate"
                        ? t("duplicate")
                        : tc("errors.generic"),
                    variant: r.ok ? "success" : "danger",
                  });
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              {t("recommend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ResolveDataRequestButton({ id }: { id: string }) {
  const t = useTranslations("admin.candidates.detail");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await resolveDataRequest(id);
          toast({
            title: r.ok ? t("resolved") : tc("errors.generic"),
            variant: r.ok ? "success" : "danger",
          });
          router.refresh();
        })
      }
    >
      {t("resolve")}
    </Button>
  );
}
