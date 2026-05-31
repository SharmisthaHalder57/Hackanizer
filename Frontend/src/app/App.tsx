import { RouterProvider } from 'react-router';
import { router } from './routes';
import { MagneticCursor } from './components/MagneticCursor';
import { HackathonProvider } from '../lib/hackathon-context';

export default function App() {
  return (
    <HackathonProvider>
      <MagneticCursor />
      <RouterProvider router={router} />
    </HackathonProvider>
  );
}