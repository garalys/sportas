import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { SetupNotice } from './components/SetupNotice';
import { RequireAuth, RequireTrainer } from './components/RequireAuth';
import { AppLayout } from './components/layout/AppLayout';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Calendar } from './pages/Calendar';
import { Workouts } from './pages/Workouts';
import { RoutineDetail } from './pages/RoutineDetail';
import { ActiveWorkout } from './pages/ActiveWorkout';
import { Cardio } from './pages/Cardio';
import { Measurements } from './pages/Measurements';
import { FoodDiary } from './pages/FoodDiary';
import { FoodPhoto } from './pages/FoodPhoto';
import { TrainerDashboard } from './pages/TrainerDashboard';
import { ClientProgress } from './pages/ClientProgress';
import { Settings } from './pages/Settings';

export default function App() {
  const { configured } = useAuth();

  if (!configured) return <SetupNotice />;

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Authenticated app shell */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/workouts" element={<Workouts />} />
          <Route path="/workouts/:routineId" element={<RoutineDetail />} />
          <Route path="/workout/:sessionId" element={<ActiveWorkout />} />
          <Route path="/cardio" element={<Cardio />} />
          <Route path="/measurements" element={<Measurements />} />
          <Route path="/food" element={<FoodDiary />} />
          <Route path="/food/photo" element={<FoodPhoto />} />
          <Route path="/profile" element={<Settings />} />

          {/* Trainer-only */}
          <Route element={<RequireTrainer />}>
            <Route path="/trainer" element={<TrainerDashboard />} />
            <Route path="/trainer/client/:clientId" element={<ClientProgress />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
