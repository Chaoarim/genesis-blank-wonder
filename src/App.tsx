import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sales from "./pages/Sales";
import Login from "./pages/Login";
import AutoIQ from "./pages/AutoIQ";
import NotFound from "./pages/NotFound";
import { OfflineIndicator } from "./components/OfflineIndicator";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <OfflineIndicator />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/sales" replace />} />
          <Route path="/vendas" element={<Navigate to="/sales" replace />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/login" element={<Login />} />
          <Route path="/autoiq" element={<AutoIQ />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
