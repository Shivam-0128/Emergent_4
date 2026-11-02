import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";

export const Comments = ({ habitId }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/habits/${habitId}/comments`).then((r) => setComments(r.data)).catch(() => {});
  }, [habitId]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post(`/habits/${habitId}/comments`, { text });
      setComments([...comments, data]);
      setText("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <section className="flex flex-col gap-5" data-testid="comments-section">
      <h2 className="font-heading font-black text-lg tracking-tight">Comments</h2>
      <ul className="flex flex-col gap-4" data-testid="comments-list">
        {comments.length === 0 && <li className="font-mono text-sm" data-testid="comments-empty">No comments yet.</li>}
        {comments.map((c) => (
          <li key={c.id} className="brut-card p-4" data-testid={`comment-${c.id}`}>
            <p className="font-mono text-xs uppercase tracking-[0.2em] mb-2" data-testid={`comment-author-${c.id}`}>{c.author_name}</p>
            <p className="whitespace-pre-wrap break-words">{c.text}</p>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="flex flex-col gap-4 max-w-2xl">
        <label className="field-label" htmlFor="comment">Comment</label>
        <textarea id="comment" rows={3} data-testid="comment-input" className="brut-input -mt-2" value={text} onChange={(e) => setText(e.target.value)} required />
        <button type="submit" disabled={busy || !text.trim()} data-testid="post-comment-button" className="brut-btn brut-btn-primary w-fit">Post comment</button>
      </form>
    </section>
  );
};
