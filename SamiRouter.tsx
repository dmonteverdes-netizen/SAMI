
import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import App from './App';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Register from './components/Register';

type Route = 'landing' | 'login' | 'register' | 'app';

const SamiRouter: React.FC = () => {
  const { currentUser } = useAuth();
  const [route, setRoute] = useState<Route>(currentUser ? 'app' : 'landing');
  const [wasLoggedIn, setWasLoggedIn] = useState(!!currentUser);

  useEffect(() => {
    if (currentUser) {
      setWasLoggedIn(true);
      setRoute('app');
    } else if (wasLoggedIn) {
      // Clear wasLoggedIn and redirect to landing page on logout
      setRoute('landing');
      setWasLoggedIn(false);
    }
  }, [currentUser, wasLoggedIn]);

  const navigateTo = (newRoute: Route) => {
    // Basic gatekeeping
    if (newRoute === 'app' && !currentUser) {
      setRoute('login');
    } else {
      setRoute(newRoute);
    }
  };

  if (currentUser && route === 'app') {
    return <App />;
  }
  
  switch(route) {
    case 'app':
      // This case handles when currentUser is missing but route is app (redirects to login via navigateTo)
      // or when we want to force App view. But with the filter above, we usually return <App /> there.
      if (currentUser) return <App />;
      return <Login onLoginSuccess={() => navigateTo('app')} onRegisterClick={() => navigateTo('register')} onBack={() => navigateTo('landing')} />;
    case 'login':
      return <Login 
        onLoginSuccess={() => navigateTo('app')} 
        onRegisterClick={() => navigateTo('register')}
        onBack={() => navigateTo('landing')}
      />;
    case 'register':
      return <Register 
        onBackToLogin={() => navigateTo('login')} 
        onBack={() => navigateTo('landing')}
        onRegisterSuccess={() => navigateTo('login')} 
      />;
    case 'landing':
    default:
      return <LandingPage 
        onLoginClick={() => navigateTo('login')} 
        onRegisterClick={() => navigateTo('register')}
        onGoToApp={() => navigateTo('app')}
      />;
  }
};

export default SamiRouter;
