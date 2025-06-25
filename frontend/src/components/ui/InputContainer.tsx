import { cn } from '@/lib/utils';

export const InputContainer = ({ error, children }: { error?: boolean; children: React.ReactNode }) => (
  <div
    className={cn(
      "relative w-full bg-white/5 rounded-lg backdrop-blur-xl transition-all duration-300 border",
      error
        ? "border-red-500/50 hover:border-red-500/70 focus-within:border-red-500/90 focus-within:shadow-[0_0_12px_rgba(239,68,68,0.5)]"
        : "border-white/20 hover:border-white/40 focus-within:border-[#778DA9] focus-within:shadow-[0_0_12px_rgba(119,141,169,0.5)]"
    )}
  >
    {children}
  </div>
);
