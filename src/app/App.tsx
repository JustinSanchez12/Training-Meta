import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CharacterWizard } from '@/features/character/CharacterWizard';
import { HubScreen } from '@/features/hub/HubScreen';
import { StartScreen } from '@/features/start/StartScreen';
import { StatsScreen } from '@/features/stats/StatsScreen';
import { usePlayer } from './playerContext';

function AppRoutes() {
  const { status } = usePlayer();
  // Wait for the save to load so guards don't redirect a returning player to Start.
  if (status === 'loading') return null;

  return (
    <Routes>
      <Route path="/" element={<StartScreen />} />
      <Route path="/create" element={<CharacterWizard />} />
      <Route path="/hub" element={<HubScreen />} />
      <Route path="/stats" element={<StatsScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}
