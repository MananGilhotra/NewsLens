/**
 * App.jsx - routes, providers and page transitions
 */

import { lazy, Suspense, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, useIsPresent } from 'framer-motion';

import { AuthProvider, useAuth } from './context/AuthContext';
import { HealthProvider } from './context/HealthContext';
import SmoothScroll from './components/layout/SmoothScroll';
import PageTransition from './components/layout/PageTransition';
import { LogoMark } from './components/brand/Logo';
import { ToastProvider } from './components/ui/Toast';

const LandingPage = lazy(() => import('./components/LandingPage'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const SignupPage = lazy(() => import('./components/SignupPage'));
const DashboardLayout = lazy(() => import('./components/dashboard/DashboardLayout'));
const NewsFeed = lazy(() => import('./components/dashboard/NewsFeed'));
const FactCheck = lazy(() => import('./components/dashboard/FactCheck'));
const DeepfakeAnalyzer = lazy(() => import('./components/dashboard/DeepfakeAnalyzer'));

function PageLoader() {
    return (
        <div className="grid min-h-screen place-items-center bg-ink" role="status" aria-label="Loading">
            <LogoMark className="h-10 w-10 animate-pulse text-lens" />
        </div>
    );
}

/** Redirect to login, remembering where to come back to. The state object is memoised: a new object
 *  on every render would make <Navigate> re-fire its effect in a loop while it stays mounted. */
function RedirectToLogin() {
    const location = useLocation();
    const from = location.pathname + location.search;
    const state = useMemo(() => ({ from }), [from]);
    return <Navigate to="/login" replace state={state} />;
}

function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    // While this page plays its exit animation (e.g. after logging out) it must not redirect on its own
    const isPresent = useIsPresent();
    if (loading) return <PageLoader />;
    if (!isAuthenticated) return isPresent ? <RedirectToLogin /> : children;
    return children;
}

function AnimatedRoutes() {
    const location = useLocation();
    const { isAuthenticated, loading } = useAuth();
    // Only top-level sections get the iris transition; dashboard tabs animate inside the layout
    const section = location.pathname.split('/')[1] || 'home';

    // Signed-out visitors go straight to login - no half-rendered dashboard flashing past
    if (section === 'app' && !loading && !isAuthenticated) return <RedirectToLogin />;

    return (
        <AnimatePresence mode="wait">
            <PageTransition key={section}>
                <Suspense fallback={<PageLoader />}>
                    <Routes location={location}>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/signup" element={<SignupPage />} />
                        <Route path="/app" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                            <Route index element={<Navigate to="feed" replace />} />
                            <Route path="feed" element={<NewsFeed />} />
                            <Route path="check" element={<FactCheck />} />
                            <Route path="deepfake" element={<DeepfakeAnalyzer />} />
                            <Route path="*" element={<Navigate to="feed" replace />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </PageTransition>
        </AnimatePresence>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <MotionConfig reducedMotion="user">
                <AuthProvider>
                    <HealthProvider>
                        <ToastProvider>
                            <SmoothScroll>
                                <AnimatedRoutes />
                            </SmoothScroll>
                        </ToastProvider>
                    </HealthProvider>
                </AuthProvider>
            </MotionConfig>
        </BrowserRouter>
    );
}
