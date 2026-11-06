import logoAsset from "@/assets/eduflow-logo.png.asset.json";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="EduFlow CollegeCompanion logo"
      className={cn("h-9 w-9 object-contain", className)}
      loading="eager"
      decoding="async"
    />
  );
}
