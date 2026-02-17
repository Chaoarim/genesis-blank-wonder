import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sales from "./pages/Sales";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import PaymentControl from "./pages/PaymentControl";
import PreRegistration from "./pages/PreRegistration";
import PixPayment from "./pages/PixPayment";
import WebhookTest from "./pages/WebhookTest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Página de vendas como página inicial */}
          <Route path="/" element={<Navigate to="/sales" replace />} />
          <Route path="/sales" element={<Sales />} />
          
          {/* Autenticação */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Área logada */}
          <Route path="/app" element={<Dashboard />} />
          
          {/* Pré-Cadastro e Pagamento */}
          <Route path="/pre-cadastro" element={<PreRegistration />} />
          <Route path="/pagamento-pix" element={<PixPayment />} />
          
          {/* Admin */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/pagamentos" element={<PaymentControl />} />
          
          {/* Teste de Webhook (pode ser removido) */}
          <Route path="/webhook-test" element={<WebhookTest />} />
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
