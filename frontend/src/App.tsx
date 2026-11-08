import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AdminRoute } from "./components/AdminRoute";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { BinDetailPage } from "./pages/BinDetailPage";
import { HomePage } from "./pages/HomePage";
import { AccountPage } from "./pages/AccountPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { WelcomePage } from "./pages/WelcomePage";
import { AdminPage } from "./pages/AdminPage";
import { BinLabelPage } from "./pages/BinLabelPage";
import { BinInventoryPrintPage } from "./pages/BinInventoryPrintPage";
import { PrintAllInventoryPage } from "./pages/PrintAllInventoryPage";
import { PrintAllLabelsPage } from "./pages/PrintAllLabelsPage";
import { PrintLocationsBinsPage } from "./pages/PrintLocationsBinsPage";
import { ReportPage } from "./pages/ReportPage";
import { ScanPage } from "./pages/ScanPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route element={<ProtectedRoute />}>
            <Route
              path="/bins/:binId/label"
              element={<BinLabelPage />}
            />
            <Route
              path="/labels/print-all"
              element={<PrintAllLabelsPage />}
            />
            <Route
              path="/bins/:binId/inventory-print"
              element={<BinInventoryPrintPage />}
            />
            <Route
              path="/inventory/print-all"
              element={<PrintAllInventoryPage />}
            />
            <Route
              path="/locations/print-all"
              element={<PrintLocationsBinsPage />}
            />
            <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/bins/:binId" element={<BinDetailPage />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
