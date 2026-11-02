import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";

export default function Community() {
  const [habits, setHabits] = useState(null);

  useEffect(() => {
    api.get("/habits/community").then((r) => setHabits(r.data)).catch((e) => toast.error(errorMessage(e)));
  }, []);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-heading font-black text-4xl tracking-tight" data-testid="page-title">Community</h1>
      {habits && habits.length === 0 && (
        <p data-testid="community-empty" className="font-mono text-sm uppercase tracking-[0.2em] py-8">No shared habits yet.</p>
      )}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="community-list">
        {habits?.map((h, i) => (
          <article key={h.id} data-testid={`community-habit-${h.id}`} className="brut-card p-6 flex flex-col gap-3 h-full fade-up" style={{ animationDelay: `${i * 50}ms` }}>
            <Link to={`/habits/${h.id}`} data-testid={`community-habit-link-${h.id}`} className="font-heading font-bold text-2xl tracking-tight hover:underline underline-offset-4 decoration-2 break-words">
              {h.name}
            </Link>
            <p className="font-mono text-xs uppercase tracking-[0.2em]" data-testid={`community-habit-owner-${h.id}`}>by {h.owner_name}</p>
            <p className="whitespace-pre-wrap break-words flex-1" data-testid={`community-habit-when-${h.id}`}>{h.when}</p>
            <p className="font-semibold border-t-2 border-foreground pt-3" data-testid={`community-habit-days-done-${h.id}`}>
              Days done: <span className="font-heading font-black text-xl">{h.days_done}</span>
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
