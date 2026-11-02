import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ListChecks, Users, LogOut, Sprout } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const links = [
  { to: "/my-habits", label: "My habits", icon: ListChecks, id: "my-habits" },
  { to: "/community", label: "Community", icon: Users, id: "community" },
];

const SignOutButton = ({ testid, className = "" }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <button
      data-testid={testid}
      onClick={() => { signOut(); navigate("/signin"); }}
      className={`brut-btn brut-btn-light ${className}`}
    >
      <LogOut size={16} strokeWidth={2.5} /> Sign out
    </button>
  );
};

export const Layout = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex">
      <aside data-testid="sidebar" className="hidden md:flex w-64 shrink-0 flex-col border-r-2 border-foreground bg-[hsl(var(--secondary))] sticky top-0 h-screen p-6 gap-8">
        <div className="flex items-center gap-2 font-heading font-black text-xl tracking-tight">
          <Sprout strokeWidth={2.5} /> Habit Circle
        </div>
        <nav className="flex flex-col gap-3">
          {links.map(({ to, label, icon: Icon, id }) => (
            <NavLink key={to} to={to} data-testid={`sidebar-${id}-button`}
              className={({ isActive }) => `brut-btn justify-start ${isActive ? "brut-btn-primary" : "brut-btn-light"}`}>
              <Icon size={18} strokeWidth={2.5} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em]">Signed in as</p>
          <p data-testid="sidebar-user-name" className="font-semibold -mt-2">{user?.display_name}</p>
          <SignOutButton testid="sidebar-sign-out-button" />
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 bg-background border-b-2 border-foreground flex items-center px-4 md:px-8 gap-4">
          <span className="md:hidden font-heading font-black tracking-tight"><Sprout className="inline" size={20} /></span>
          <nav className="flex items-center gap-5">
            {links.map(({ to, label, id }) => (
              <NavLink key={to} to={to} data-testid={`nav-${id}-link`}
                className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}>
                {label}
              </NavLink>
            ))}
          </nav>
          <SignOutButton testid="nav-sign-out-button" className="ml-auto !py-1.5" />
        </header>
        <main className="p-6 md:p-10 lg:p-12 max-w-5xl w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
