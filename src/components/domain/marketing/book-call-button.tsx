import { Button, type ButtonProps } from "@/components/ui/button";
import { serverEnv } from "@/lib/env";

type BookCallButtonProps = {
  /** Already-translated label. Callers pass it so the copy stays in next-intl. */
  label: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
};

/**
 * Booking call to action. Renders nothing when `CALENDLY_URL` is unset (PHASES-GTM 9.0):
 * a button that leads to a dead link is a promise the site cannot keep, so it disappears
 * instead of shipping an anchor with no href.
 */
export function BookCallButton({
  label,
  variant = "outline",
  size = "lg",
  className,
}: BookCallButtonProps) {
  const calendly = serverEnv().CALENDLY_URL;
  if (!calendly) return null;
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <a href={calendly} target="_blank" rel="noreferrer">
        {label}
      </a>
    </Button>
  );
}
