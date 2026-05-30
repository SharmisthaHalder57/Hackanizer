import { RouterProvider } from 'react-router';
import { router } from './routes';
import { MagneticCursor } from './components/MagneticCursor';

export default function App() {
  return (
    <>
      <MagneticCursor />
      <RouterProvider router={router} />
    </>
  );
}