import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import BuilderPage from "@/pages/builder";
import ScreenerPage from "@/pages/screener";
import LoginPage from "@/pages/login";
import JobsPage from "@/pages/jobs";
import StudentPage from "@/pages/student";
import JobDetailPage from "@/pages/job-detail";
import ResumePage from "@/pages/resume";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/builder" component={BuilderPage} />
      <Route path="/screener" component={ScreenerPage} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/jobs/:jobId/analyze" component={() => <JobDetailPage analyze />} />
      <Route path="/jobs/:jobId" component={() => <JobDetailPage />} />
      <Route path="/student" component={StudentPage} />
      <Route path="/resume" component={ResumePage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
