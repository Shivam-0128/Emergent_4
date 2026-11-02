import { Sprout } from "lucide-react";

const BANNER = "https://images.unsplash.com/photo-1730473360570-881f4bd1b2e3?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

export const AuthShell = ({ title, children }) => (
  <div className="min-h-screen grid lg:grid-cols-2">
    <div className="flex flex-col justify-center p-8 md:p-16">
      <div className="flex items-center gap-2 font-heading font-black text-xl tracking-tight mb-12">
        <Sprout strokeWidth={2.5} /> Habit Circle
      </div>
      <h1 className="font-heading font-black text-4xl sm:text-5xl tracking-tight mb-8">{title}</h1>
      <div className="brut-card p-6 md:p-8 max-w-md">{children}</div>
    </div>
    <div className="hidden lg:block border-l-2 border-foreground bg-cover bg-center" style={{ backgroundImage: `url(${BANNER})` }}>
      <div className="h-full flex items-end p-12">
        <p className="brut-card px-5 py-4 max-w-sm font-heading font-bold text-lg">
          Track your daily habits, keep some private, and talk the rest through with your circle.
        </p>
      </div>
    </div>
  </div>
);
