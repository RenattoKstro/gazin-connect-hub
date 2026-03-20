import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import TV from "./pages/TV";
import Downloads from "./pages/Downloads";
import SalesDuel from "./pages/SalesDuel";
import NotFound from "./pages/NotFound";
import CalculatorPage from "./pages/CalculatorPage";

const queryClient = new QueryClient();

const DuelAdminOnlyRoute = ({ children }: { children: JSX.Element }) => {
  const { accessLevel, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (accessLevel === 'duel_admin') {
    return <Navigate to="/duelo" replace />;
  }

  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/busca/:nome" element={<Index />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/cadastro" element={<Auth />} />
    <Route path="/duelo" element={<SalesDuel />} />
    <Route path="/admin" element={<DuelAdminOnlyRoute><Admin /></DuelAdminOnlyRoute>} />
    <Route path="/downloads" element={<DuelAdminOnlyRoute><Downloads /></DuelAdminOnlyRoute>} />
    <Route path="/tv" element={<DuelAdminOnlyRoute><TV /></DuelAdminOnlyRoute>} />
    <Route path="/calculadora" element={<DuelAdminOnlyRoute><CalculatorPage /></DuelAdminOnlyRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
