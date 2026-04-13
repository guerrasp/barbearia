import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
}

export default function Card({ children, className, title, description, action }: CardProps) {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-6", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
            {description && <p className="text-sm text-muted mt-1">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
