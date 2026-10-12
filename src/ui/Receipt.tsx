import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ReceiptText } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "../kit";
import { EASE } from "../kit/lib/motion";
import type { Receipt } from "../lib/types";

/**
 * The source sentence from the rules, with the phrase that produced the answer
 * highlighted. Pasted text is untrusted: it is only ever rendered as text.
 */
export function Slip({ receipt, className }: { receipt: Receipt; className?: string }) {
  const { quote, mark } = receipt;
  return (
    <blockquote
      className={cn(
        "relative rounded-[12px] border border-hair bg-paper-2 px-3.5 pb-3 pt-3.5 font-mono text-[12.5px] leading-[1.7] text-ink-2 [overflow-wrap:anywhere]",
        "before:absolute before:inset-x-3 before:top-0 before:border-t before:border-dashed before:border-[var(--hair-strong)]",
        className,
      )}
    >
      {mark ? (
        <>
          {quote.slice(0, mark[0])}
          <mark className="rounded-[4px] bg-accent-soft px-0.5 text-ink underline decoration-accent decoration-[1.5px] underline-offset-[3px]">
            {quote.slice(mark[0], mark[1])}
          </mark>
          {quote.slice(mark[1])}
        </>
      ) : (
        quote
      )}
    </blockquote>
  );
}

/** "Receipt" chip that unfolds the source sentence(s). */
export function ReceiptToggle({
  receipts,
  defaultOpen = false,
  className,
}: {
  receipts: Array<Receipt | null | undefined>;
  defaultOpen?: boolean;
  className?: string;
}) {
  const list = receipts.filter((r): r is Receipt => Boolean(r && r.quote));
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  if (!list.length) return null;
  return (
    <div className={cn("mt-2.5", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="group inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--hair-strong)] px-2.5 py-1 font-mono text-[11.5px] uppercase tracking-[0.06em] text-muted transition-colors hover:border-ink hover:text-ink active:scale-[0.98] aria-expanded:border-ink aria-expanded:text-ink"
      >
        <ReceiptText size={13} strokeWidth={1.7} />
        {list.length > 1 ? `Receipts (${list.length})` : "Receipt"}
        <ChevronDown size={12} strokeWidth={1.8} className="transition-transform duration-300 group-aria-expanded:rotate-180" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-2">
              {list.map((r, i) => (
                <Slip key={i} receipt={r} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
