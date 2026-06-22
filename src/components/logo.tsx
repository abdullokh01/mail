import Image from "next/image";
import { cn } from "@/lib/utils";

/** Aurum Global Group brand symbol (hammer over mountains), no wordmark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/aurum-mark.png"
      alt="Aurum Global Group"
      width={1063}
      height={654}
      priority
      className={cn("w-auto object-contain", className)}
    />
  );
}

export function Logo({
  className,
  subtitle = "Smart Inbox",
}: {
  className?: string;
  subtitle?: string | null;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-7" />
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-[0.18em]">AURUM MAIL</p>
        {subtitle && (
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
