
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { UserProvider } from './context/UserContext';
import { FinancialDataProvider } from './context/FinancialDataContext';
import { ErrorBoundary } from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <UserProvider>
      <FinancialDataProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </FinancialDataProvider>
    </UserProvider>
  </React.StrictMode>
);
