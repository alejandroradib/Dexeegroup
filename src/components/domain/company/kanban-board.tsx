"use client";

import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { ChevronDownIcon, GripVerticalIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { CefrBadge } from "@/components/shared/cefr-badge";
import { WorkStyleBadge } from "@/components/shared/workstyle-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { moveApplication } from "@/server/actions/company";
import type { ApplicationStatus, PipelineCard } from "@/server/services/jobs";

import { ApplicantDrawer } from "./applicant-drawer";

const COLUMNS: ApplicationStatus[] = ["applied", "screening", "shortlisted", "interview", "offer", "hired", "rejected"];

type Props = { cards: PipelineCard[]; initialOpen?: string | null };

function Card({ card, onOpen, onMove, dragging }: { card: PipelineCard; onOpen: () => void; onMove: (status: ApplicationStatus) => void; dragging?: boolean }) {
  const t = useTranslations("company.pipeline");
  const tc = useTranslations("common");
  const te = useTranslations("enums.application_status");
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.application.id, data: { status: card.application.status } });
  const c = card.candidate;
  return (
    <li
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn("rounded-[12px] border border-border bg-white p-3 shadow-sm", (isDragging || dragging) && "opacity-60")}
    >
      <div className="flex items-start gap-2">
        <button type="button" className="mt-0.5 cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-mist" aria-label={t("dragHint")} {...listeners} {...attributes}>
          <GripVerticalIcon className="size-4" />
        </button>
        <button type="button" onClick={onOpen} className="flex-1 text-left" aria-label={t("openCard")}>
          <p className="text-sm font-semibold text-navy">{c ? `${c.first_name} ${c.last_initial ?? ""}.` : "—"}</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">{c?.headline}</p>
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {c?.years_experience !== null && c?.years_experience !== undefined ? <Badge variant="outline">{tc("labels.yearsShort", { count: Math.round(c.years_experience) })}</Badge> : null}
        <CefrBadge verified={c?.english_verified_level} written={c?.english_written_level} self={c?.english_self_level} />
        {card.workstyleVisible ? <WorkStyleBadge completedAt={c?.psychometric_completed_at} /> : null}
        {card.application.source === "dexee_recommended" ? <Badge variant="accent">{tc("labels.dexeeRecommended")}</Badge> : null}
      </div>
      <div className="mt-2 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">{t("moveTo")} <ChevronDownIcon className="size-3" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {COLUMNS.filter((s) => s !== card.application.status).map((s) => (
              <DropdownMenuItem key={s} onSelect={() => onMove(s)}>{te(s)}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function Column({ status, children, count }: { status: ApplicationStatus; children: React.ReactNode; count: number }) {
  const te = useTranslations("enums.application_status");
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section ref={setNodeRef} className={cn("flex min-h-[200px] w-[260px] shrink-0 flex-col rounded-[12px] bg-mist/80 p-2", isOver && "ring-2 ring-green")} aria-label={te(status)}>
      <header className="flex items-center justify-between px-1 pb-2">
        <h3 className="text-xs font-semibold tracking-wide text-navy uppercase">{te(status)}</h3>
        <span className="rounded-full bg-white px-2 text-xs text-muted-foreground">{count}</span>
      </header>
      <ul className="flex flex-1 flex-col gap-2">{children}</ul>
    </section>
  );
}

export function KanbanBoard({ cards: initial, initialOpen = null }: Props) {
  const t = useTranslations("company.pipeline");
  const tc = useTranslations("common");
  const te = useTranslations("enums.application_status");
  const { toast } = useToast();
  const router = useRouter();
  const [cards, setCards] = useState(initial);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(initialOpen);
  const [showWithdrawn, setShowWithdrawn] = useState(false);
  const [, start] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  function move(applicationId: string, status: ApplicationStatus) {
    const previous = cards;
    const current = cards.find((c) => c.application.id === applicationId);
    if (!current || current.application.status === status) return;
    // Optimistic update with rollback on failure (SPEC 10.2).
    setCards((prev) => prev.map((c) => (c.application.id === applicationId ? { ...c, application: { ...c.application, status } } : c)));
    start(async () => {
      const result = await moveApplication(applicationId, status);
      if (result.ok) {
        toast({ title: t("moved", { status: te(status) }), variant: "success" });
        router.refresh();
      } else {
        setCards(previous);
        toast({ title: t("moveFailed"), variant: "danger" });
      }
    });
  }

  function onDragEnd(event: DragEndEvent) {
    setActive(null);
    const over = event.over?.id;
    if (!over || typeof over !== "string") return;
    if (!COLUMNS.includes(over as ApplicationStatus)) return;
    move(String(event.active.id), over as ApplicationStatus);
  }

  const withdrawn = cards.filter((c) => c.application.status === "withdrawn");
  const activeCard = active ? cards.find((c) => c.application.id === active) : null;

  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground">{t("dragHint")}</p>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e: DragStartEvent) => setActive(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((status) => {
            const items = cards.filter((c) => c.application.status === status);
            return (
              <Column key={status} status={status} count={items.length}>
                {items.map((card) => (
                  <Card key={card.application.id} card={card} onOpen={() => setOpen(card.application.id)} onMove={(s) => move(card.application.id, s)} />
                ))}
              </Column>
            );
          })}
        </div>
        <DragOverlay>{activeCard ? <ul><Card card={activeCard} onOpen={() => undefined} onMove={() => undefined} dragging /></ul> : null}</DragOverlay>
      </DndContext>
      <div className="mt-2">
        <button type="button" className="text-sm text-link hover:underline" onClick={() => setShowWithdrawn((v) => !v)} aria-expanded={showWithdrawn}>
          {t("withdrawn", { count: withdrawn.length })}
        </button>
        {showWithdrawn && withdrawn.length > 0 ? (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {withdrawn.map((card) => (
              <li key={card.application.id} className="rounded-[12px] border border-border bg-white p-3 text-sm opacity-70">
                <button type="button" onClick={() => setOpen(card.application.id)} className="text-left">
                  <p className="font-medium text-navy">{card.candidate ? `${card.candidate.first_name} ${card.candidate.last_initial ?? ""}.` : "—"}</p>
                  <p className="text-xs text-muted-foreground">{card.candidate?.headline}</p>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <ApplicantDrawer applicationId={open} onClose={() => setOpen(null)} onChanged={() => router.refresh()} />
      <span className="sr-only" aria-live="polite">{tc("labels.loading")}</span>
    </>
  );
}
