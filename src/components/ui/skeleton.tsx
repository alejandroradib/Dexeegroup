import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("bg-mist animate-pulse rounded-[10px]", className)} {...props} />;
}

export { Skeleton };
