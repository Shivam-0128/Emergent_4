import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import SignUp from "@/pages/SignUp";
import SignIn from "@/pages/SignIn";
import MyHabits from "@/pages/MyHabits";
import Community from "@/pages/Community";
import HabitPage from "@/pages/HabitPage";

const Protected = () => {
  const { user } = useAuth();
  if (user === null) return <p className="p-8 font-mono text-sm">Loading…</p>;
  if (!user) return <Navigate to="/signin" replace />;
  return <Layout />;
};

const GuestOnly = ({ children }) => {
  const { user } = useAuth();
  if (user === null) return null;
  return user ? <Navigate to="/my-habits" replace /> : children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signup" element={<GuestOnly><SignUp /></GuestOnly>} />
          <Route path="/signin" element={<GuestOnly><SignIn /></GuestOnly>} />
          <Route element={<Protected />}>
            <Route path="/my-habits" element={<MyHabits />} />
            <Route path="/community" element={<Community />} />
            <Route path="/habits/:id" element={<HabitPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/my-habits" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" toastOptions={{ className: "brut-toast" }} />
    </AuthProvider>
  );
}

export default App;
