import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Participant from "./pages/Participant";
import CoachHub from "./pages/CoachHub";
import CoachFancy from "./pages/CoachFancy";
import CoachNeutral from "./pages/CoachNeutral";
import AdminTeilnehmer from "./pages/AdminTeilnehmer";
import AdminCoaches from "./pages/AdminCoaches";
import ResetPassword from "./pages/ResetPassword";
import AdminStats from "./pages/AdminStats";
import Display from "./pages/Display";
import ProfileEdit from "./pages/ProfileEdit";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RecoveryRedirect({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery') && location.pathname !== '/reset-password') {
      navigate('/reset-password' + hash, { replace: true });
    }
  }, []);

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RecoveryRedirect>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/training" element={<ProtectedRoute><Participant /></ProtectedRoute>} />
              <Route path="/participant" element={<ProtectedRoute><Participant /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute requireCoach><CoachFancy /></ProtectedRoute>} />
              <Route path="/coach" element={<ProtectedRoute requireCoach><CoachHub /></ProtectedRoute>} />
              <Route path="/coach/fancy" element={<ProtectedRoute requireCoach><CoachFancy /></ProtectedRoute>} />
              <Route path="/coach/neutral" element={<ProtectedRoute requireCoach><CoachNeutral /></ProtectedRoute>} />
              <Route path="/admin/teilnehmer" element={<ProtectedRoute requireCoach><AdminTeilnehmer /></ProtectedRoute>} />
              <Route path="/admin/coaches" element={<ProtectedRoute requireCoach><AdminCoaches /></ProtectedRoute>} />
              <Route path="/admin/stats" element={<ProtectedRoute requireCoach><AdminStats /></ProtectedRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/display" element={<Display />} />
              <Route path="/profile/edit" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </RecoveryRedirect>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
