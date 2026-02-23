import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import Leads from "./pages/Leads";
import Deals from "./pages/Deals";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import FinancialDashboard from "./pages/FinancialDashboard";
import Invoices from "./pages/Invoices";
import Tasks from "./pages/Tasks";
import Tickets from "./pages/Tickets";
import Integrations from "./pages/Integrations";
import Reports from "./pages/Reports";
import Roles from "./pages/Roles";
import AuditLogs from "./pages/AuditLogs";
import AcceptInvite from "./pages/AcceptInvite";
import MavieChat from "./pages/MavieChat";
import Inbox from "./pages/Inbox";
import Agenda from "./pages/Agenda";
import WhatsAppConfig from "./pages/WhatsAppConfig";
import IntegracoesPage from "./pages/Integracoes";
import GoogleCallbackPage from "./pages/GoogleCallback";
import Relatorios from "./pages/Relatorios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/aceitar-convite" element={<AcceptInvite />} />
            
            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mavie"
              element={
                <ProtectedRoute>
                  <MavieChat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads"
              element={
                <ProtectedRoute>
                  <Leads />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute requireAdmin>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes/roles"
              element={
                <ProtectedRoute requireAdmin>
                  <Roles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes/auditoria"
              element={
                <ProtectedRoute requireAdmin>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes/usuarios"
              element={
                <ProtectedRoute requireAdmin>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes/produtos"
              element={
                <ProtectedRoute requireAdmin>
                  <Products />
                </ProtectedRoute>
              }
            />
            <Route
              path="/propostas"
              element={
                <ProtectedRoute>
                  <Deals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clientes"
              element={
                <ProtectedRoute>
                  <Customers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financeiro"
              element={
                <ProtectedRoute>
                  <FinancialDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/faturas"
              element={
                <ProtectedRoute>
                  <Invoices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tarefas"
              element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suporte"
              element={
                <ProtectedRoute>
                  <Tickets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inbox"
              element={
                <ProtectedRoute>
                  <Inbox />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agenda"
              element={
                <ProtectedRoute>
                  <Agenda />
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios"
              element={
                <ProtectedRoute>
                  <Relatorios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes/whatsapp"
              element={
                <ProtectedRoute requireAdmin>
                  <WhatsAppConfig />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes/integracoes"
              element={
                <ProtectedRoute requireAdmin>
                  <Integrations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/google-calendar"
              element={
                <ProtectedRoute>
                  <IntegracoesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/google-calendar/callback"
              element={<GoogleCallbackPage />}
            />
            
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
