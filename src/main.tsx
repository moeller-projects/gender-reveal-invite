import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import './i18n';
import App from './App';
import HomePage from './pages/HomePage';
import WishlistPage from './pages/WishlistPage';
import WishlistAdminPage from './pages/WishlistAdminPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'wishlist', element: <WishlistPage /> },
      { path: 'wishlist/admin', element: <WishlistAdminPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
