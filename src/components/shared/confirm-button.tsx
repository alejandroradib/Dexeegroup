"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ConfirmButtonProps = Omit<ButtonProps, "onClick"> & {
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  children: ReactNode;
};

export function ConfirmButton({ title, description, confirmLabel, onConfirm, children, ...buttonProps }: ConfirmButtonProps) {
  const t = useTranslations("common.actions");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button {...buttonProps} onClick={() => setOpen(true)}>{children}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={t("close")}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button variant={buttonProps.variant === "destructive" ? "destructive" : "default"} disabled={pending} onClick={() => start(async () => { await onConfirm(); setOpen(false); })}>
              {confirmLabel ?? t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
