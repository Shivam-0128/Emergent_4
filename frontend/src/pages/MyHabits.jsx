import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Globe } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";

const AddHabitForm = ({ onAdded }) => {
  const [form, setForm] = useState({ name: "", when: "", shared: false });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/habits", form);
      onAdded(data);
      setForm({ name: "", when: "", shared: false });
      toast.success("Habit added");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} data-testid="add-habit-form" className="brut-card p-6 md:p-8 flex flex-col gap-5">
      <label className="field-label" htmlFor="habit-name">Habit name</label>
      <input id="habit-name" data-testid="habit-name-input" className="brut-input -mt-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <label className="field-label" htmlFor="habit-when">When I do it</label>
      <textarea id="habit-when" data-testid="habit-when-input" rows={3} className="brut-input -mt-3"
        placeholder="e.g. After my morning coffee, when I'm at my desk before meetings start"
        value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} />
      <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
        <input type="checkbox" data-testid="habit-share-checkbox" className="chunky-check !w-6 !h-6" checked={form.shared} onChange={(e) => setForm({ ...form, shared: e.target.checked })} />
        <span className="font-semibold">Share with the community</span>
      </label>
      <button type="submit" disabled={busy} data-testid="add-habit-button" className="brut-btn brut-btn-primary w-fit">Add habit</button>
    </form>
  );
};

export const ShareBadge = ({ shared, testid }) => (
  <span data-testid={testid} className={`brut-badge ${shared ? "bg-[hsl(var(--secondary))]" : "bg-white"}`}>
    {shared ? <Globe size={12} strokeWidth={2.5} /> : <Lock size={12} strokeWidth={2.5} />}
    {shared ? "Shared" : "Private"}
  </span>
);

export default function MyHabits() {
  const [habits, setHabits] = useState(null);

  useEffect(() => {
    api.get("/habits/mine").then((r) => setHabits(r.data)).catch((e) => toast.error(errorMessage(e)));
  }, []);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-heading font-black text-4xl tracking-tight" data-testid="page-title">My habits</h1>
      <AddHabitForm onAdded={(h) => setHabits([h, ...(habits || [])])} />
      <section className="flex flex-col gap-4" data-testid="my-habits-list">
        {habits && habits.length === 0 && (
          <p data-testid="my-habits-empty" className="font-mono text-sm uppercase tracking-[0.2em] py-8">No habits yet. Add your first one above.</p>
        )}
        {habits?.map((h, i) => (
          <div key={h.id} data-testid={`habit-item-${h.id}`} className="brut-card p-5 flex items-center justify-between gap-4 fade-up" style={{ animationDelay: `${i * 50}ms` }}>
            <Link to={`/habits/${h.id}`} data-testid={`habit-link-${h.id}`} className="font-heading font-bold text-xl tracking-tight hover:underline underline-offset-4 decoration-2 break-words min-w-0">
              {h.name}
            </Link>
            <ShareBadge shared={h.shared} testid={`habit-status-${h.id}`} />
          </div>
        ))}
      </section>
    </div>
  );
}
