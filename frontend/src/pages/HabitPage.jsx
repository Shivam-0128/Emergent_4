import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { api, errorMessage, lastSevenDays } from "@/lib/api";
import { ShareBadge } from "@/pages/MyHabits";
import { Comments } from "@/components/Comments";

const DayList = ({ habit, onToggle }) => {
  const done = new Set(habit.done_dates);
  return (
    <section className="brut-card p-6 h-full" data-testid="last-7-days">
      <h2 className="font-heading font-black text-lg tracking-tight mb-4">Last 7 days</h2>
      <ul className="flex flex-col gap-3">
        {lastSevenDays().map((d) => (
          <li key={d}>
            <label className="flex items-center gap-4 w-fit cursor-pointer">
              <input type="checkbox" data-testid={`day-checkbox-${d}`} className="chunky-check"
                checked={done.has(d)} disabled={!habit.is_owner} onChange={(e) => onToggle(d, e.target.checked)} />
              <span className="font-mono">{d}</span>
            </label>
          </li>
        ))}
      </ul>
      {!habit.is_owner && <p className="text-sm mt-4 font-mono">Only {habit.owner_name} can tick these days.</p>}
    </section>
  );
};

const Stat = ({ label, value, testid }) => (
  <div className="brut-card p-6 flex flex-col justify-between h-full" data-testid={testid}>
    <span className="font-semibold">{label}</span>
    <span className="font-heading font-black text-5xl">{value}</span>
  </div>
);

export default function HabitPage() {
  const { id } = useParams();
  const [habit, setHabit] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/habits/${id}`).then((r) => setHabit(r.data)).catch((e) => setError(errorMessage(e)));
  }, [id]);

  const toggle = async (date, done) => {
    const prev = habit;
    setHabit({ ...habit, done_dates: done ? [...habit.done_dates, date] : habit.done_dates.filter((x) => x !== date) });
    try {
      const { data } = await api.put(`/habits/${id}/ticks`, { date, done });
      setHabit(data);
    } catch (e) {
      setHabit(prev);
      toast.error(errorMessage(e));
    }
  };

  if (error) return <p data-testid="habit-error" className="font-semibold">{error}</p>;
  if (!habit) return <p className="font-mono text-sm">Loading…</p>;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <ShareBadge shared={habit.shared} testid="habit-share-status" />
          <span className="font-mono text-xs uppercase tracking-[0.2em]" data-testid="habit-owner">by {habit.owner_name}</span>
        </div>
        <h1 className="font-heading font-black text-4xl sm:text-5xl tracking-tight break-words" data-testid="habit-name">{habit.name}</h1>
        <div>
          <p className="field-label mb-1">When I do it</p>
          <p className="whitespace-pre-wrap break-words text-lg" data-testid="habit-when">{habit.when}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:row-span-2"><DayList habit={habit} onToggle={toggle} /></div>
        <Stat label="Days done:" value={habit.days_done} testid="days-done" />
        <Stat label="Current streak:" value={habit.current_streak} testid="current-streak" />
      </div>
      <Comments habitId={id} />
    </div>
  );
}
