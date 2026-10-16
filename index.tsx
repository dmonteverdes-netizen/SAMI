
import React from 'react';
import ReactDOM from 'react-dom/client';
import SamiRouter from './SamiRouter';
import { AuthProvider } from './core/context/AuthContext';
import { ThemeProvider } from './core/context/ThemeContext';
import { SecurityProvider } from './core/context/SecurityContext';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <SecurityProvider>
        <AuthProvider>
          <SamiRouter />
        </AuthProvider>
      </SecurityProvider>
    </ThemeProvider>
  </React.StrictMode>
);