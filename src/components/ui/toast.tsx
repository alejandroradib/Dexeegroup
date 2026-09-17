"use client";

import { XIcon } from "lucide-react";
import { Toast as ToastPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "danger";
type ToastInput = { title: string; description?: string; variant?: ToastVariant };
type ToastItem = ToastInput & { id: number };

const ToastContext = React.createContext<{ toast: (input: ToastInput) => void } | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({
  children,
  closeLabel = "Close",
}: {
  children: React.ReactNode;
  closeLabel?: string;
}) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const counter = React.useRef(0);
  const toast = React.useCallback((input: ToastInput) => {
    counter.current += 1;
    setItems((prev) => [...prev, { ...input, id: counter.current }]);
  }, []);
  const dismiss = (id: number) => setItems((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {items.map((item) => (
          <ToastPrimitive.Root
            key={item.id}
            onOpenChange={(open) => !open && dismiss(item.id)}
            className={cn(
              "grid w-full items-start gap-1 rounded-[12px] border p-4 pr-10 text-sm shadow-lg",
              item.variant === "success" && "bg-mint text-navy border-transparent",
              item.variant === "danger" && "bg-danger-soft text-danger border-transparent",
              (!item.variant || item.variant === "default") && "border-border text-navy bg-white",
            )}
          >
            <ToastPrimitive.Title className="font-semibold">{item.title}</ToastPrimitive.Title>
            {item.description ? (
              <ToastPrimitive.Description className="opacity-90">
                {item.description}
              </ToastPrimitive.Description>
            ) : null}
            <ToastPrimitive.Close
              className="absolute top-3 right-3 rounded-[6px] opacity-70 hover:opacity-100"
              aria-label={closeLabel}
            >
              <XIcon className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed right-0 bottom-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
