import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sales from "./pages/Sales";
import SalesHub from "./pages/SalesHub";
import CatalogB2B from "./pages/CatalogB2B";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import PartsSearch from "./pages/PartsSearch";
import Admin from "./pages/AdminNew";
import PaymentControl from "./pages/PaymentControl";
import PreRegistration from "./pages/PreRegistration";
import PixPayment from "./pages/PixPayment";
import PixRenewal from "./pages/PixRenewal";
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
          
          {/* Área logada — /app redireciona para /vendas */}
          <Route path="/app" element={<Navigate to="/vendas" replace />} />
          <Route path="/buscar-pecas" element={<PartsSearch />} />
          <Route path="/vendas" element={<SalesHub />} />
          
          {/* Catálogo B2B público */}
          <Route path="/catalogo/:sellerId" element={<CatalogB2B />} />
          
          {/* Pré-Cadastro e Pagamento */}
          <Route path="/pre-cadastro" element={<PreRegistration />} />
          <Route path="/pagamento-pix" element={<PixPayment />} />
          <Route path="/renovacao-pix" element={<PixRenewal />} />
          
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
