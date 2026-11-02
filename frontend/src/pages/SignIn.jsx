import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AuthShell } from "@/components/AuthShell";

export default function SignIn() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const { data } = await api.post("/auth/signin", form);
      signIn(data);
      navigate("/my-habits");
    } catch (err) {
      setError(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Sign in">
      <form onSubmit={submit} className="flex flex-col gap-5" data-testid="signin-form">
        <label className="field-label" htmlFor="email">Email</label>
        <input id="email" type="email" data-testid="signin-email-input" className="brut-input -mt-3" value={form.email} onChange={set("email")} required />
        <label className="field-label" htmlFor="password">Password</label>
        <input id="password" type="password" data-testid="signin-password-input" className="brut-input -mt-3" value={form.password} onChange={set("password")} required />
        {error && <p data-testid="signin-error" className="text-sm font-semibold text-[hsl(var(--destructive))]">{error}</p>}
        <button type="submit" disabled={busy} data-testid="signin-submit-button" className="brut-btn brut-btn-primary mt-2">Sign in</button>
        <p className="text-sm">New here? <Link to="/signup" data-testid="goto-signup-link" className="underline font-semibold">Sign up</Link></p>
      </form>
    </AuthShell>
  );
}
