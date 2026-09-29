import { Navigate, Outlet } from 'react-router-dom';
import { usePlayer } from './playerContext';

/** Layout route for screens that need a character: without one, go to Start. Children can then call `useSave()`. */
export function RequireSave() {
  const { save } = usePlayer();
  return save ? <Outlet /> : <Navigate to="/" replace />;
}
