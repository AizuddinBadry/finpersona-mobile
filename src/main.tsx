import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import './index.css';
import App from './App';

if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#FAF8FF' }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
