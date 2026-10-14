import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ThemeContextProvider } from './context/ThemeContext';
import { IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DescriptionIcon from '@mui/icons-material/Description';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import HistoryIcon from '@mui/icons-material/History';
// import AssignmentIcon from '@mui/icons-material/Assignment';

import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ProtectedRoute from './components/ProtectedRoute';
import FloatingMenu from './components/Subject/layout/FloatingMenu';
import DJRBLogo from './components/auth/logo';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './components/NotFound';
import HomePage from './components/Subject/layout/HomePage';
import Subject from './components/Subject/subject';
import CustomQuery from './components/tools/CustomQuery';
import Compare from './components/tools/Compare';
import HtmlExtractor from './components/tools/HtmlExtractor';
import Form1004D from './components/Subject/2.6/1004D';
import History from './components/tools/History';
import Guide from './components/pages/Guide';
import ContactUs from './components/pages/ContactUs';
import TermsOfService from './components/pages/TermsOfService';
import PrivacyPolicy from './components/pages/PrivacyPolicy';

import AutoModeIcon from '@mui/icons-material/AutoMode';
function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const menuButtonRef = useRef(null);

  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('isAuthenticated') === 'true'
  );
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('isAuthenticated', String(isAuthenticated));
  }, [isAuthenticated]);
  const handleLogout = () => {
    setMenuOpen(false);
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    localStorage.removeItem('authToken');
    navigate('/login', { replace: true });
  };

  const hideHeader = location.pathname === '/login';

  const navItems = [
    { label: 'Full Review', path: '/extractor', icon: <DescriptionIcon /> },
    { label: 'ECR Review', path: '/ecr', icon: <CompareArrowsIcon /> },
    { label: 'Revised Review', path: '/compare', icon: <CompareArrowsIcon /> },
    { label: 'automation ', path: 'https://praman-strdjrbservices.pythonanywhere.com/api/automation/', icon: <AutoModeIcon /> },
    { label: 'Custom Query', path: '/query', icon: <SearchIcon /> },
    { label: '1004D', path: '/1004D', icon: <AssignmentTurnedInIcon /> },
    // { label: 'Scenario', path: '/scenario2', icon: <AssignmentIcon /> },
    { label: 'History', path: '/history', icon: <HistoryIcon /> },

  ];

  return (
    <ErrorBoundary>
      {!hideHeader && (
        <IconButton
          ref={menuButtonRef}
          onClick={() => setMenuOpen((p) => !p)}
          sx={{
            position: 'fixed',
            top: 16,
            right: 24,
            zIndex: 1500,
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            transition: 'all 0.35s ease',
            transform: menuOpen ? 'rotate(90deg) scale(1.05)' : 'rotate(0deg)',
            '&:hover': {
              background: 'rgba(255,255,255,0.9)',
              transform: 'rotate(90deg) scale(1.1)',
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {!hideHeader && (
        <FloatingMenu
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          menuButtonRef={menuButtonRef}
          navItems={navItems}
          location={location}
          isAuthenticated={isAuthenticated}
          handleLogout={handleLogout}
        />
      )}

      <ThemeContextProvider>
        <Routes>

          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
          <Route path="/contact" element={<ContactUs />} />

          <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
            <Route path='/logo' element={<DJRBLogo />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/extractor" element={<Subject />} />
            <Route path="/erc" element={<Subject defaultFormType="ERC" />} />
            <Route path="/ecr" element={<Subject defaultFormType="ERC" />} />
            <Route path="/query" element={<CustomQuery />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/html-extractor" element={<HtmlExtractor />} />
            <Route path="/1004D" element={<Form1004D />} />



            <Route path="/history" element={<History />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ThemeContextProvider>
    </ErrorBoundary>
  );
}

export default App;
