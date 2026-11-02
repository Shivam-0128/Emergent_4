import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AuthShell } from "@/components/AuthShell";

export default function SignUp() {
  const [form, setForm] = useState({ display_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const { data } = await api.post("/auth/signup", form);
      signIn(data);
      navigate("/my-habits");
    } catch (err) {
      setError(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Sign up">
      <form onSubmit={submit} className="flex flex-col gap-5" data-testid="signup-form">
        <label className="field-label" htmlFor="display_name">Display name</label>
        <input id="display_name" data-testid="signup-display-name-input" className="brut-input -mt-3" value={form.display_name} onChange={set("display_name")} required />
        <label className="field-label" htmlFor="email">Email</label>
        <input id="email" type="email" data-testid="signup-email-input" className="brut-input -mt-3" value={form.email} onChange={set("email")} required />
        <label className="field-label" htmlFor="password">Password</label>
        <input id="password" type="password" data-testid="signup-password-input" className="brut-input -mt-3" value={form.password} onChange={set("password")} required minLength={6} />
        {error && <p data-testid="signup-error" className="text-sm font-semibold text-[hsl(var(--destructive))]">{error}</p>}
        <button type="submit" disabled={busy} data-testid="signup-submit-button" className="brut-btn brut-btn-primary mt-2">Sign up</button>
        <p className="text-sm">Already have an account? <Link to="/signin" data-testid="goto-signin-link" className="underline font-semibold">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}
