import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-[10px] bg-mist", className)} {...props} />;
}

export { Skeleton };
