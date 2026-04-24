import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api.js';

const SettingsContext = createContext({});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    schoolName: 'SDH KUPANG',
    primaryColor: '#1e40af',
    secondaryColor: '#3b82f6',
    accentColor: '#f59e0b',
    logoUrl: null,
  });

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data.data);
      const root = document.documentElement;
      if (res.data.data.primaryColor) root.style.setProperty('--color-primary', res.data.data.primaryColor);
      if (res.data.data.secondaryColor) root.style.setProperty('--color-secondary', res.data.data.secondaryColor);
      if (res.data.data.accentColor) root.style.setProperty('--color-accent', res.data.data.accentColor);
      document.title = `${res.data.data.schoolName || 'SDH KUPANG'} - Sistem Keterlambatan`;
    } catch {}
  };

  useEffect(() => { fetchSettings(); }, []);

  return <SettingsContext.Provider value={{ settings, refetchSettings: fetchSettings }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
