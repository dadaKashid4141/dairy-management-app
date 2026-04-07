import { Routes } from '@angular/router';
import { Home } from './features/dashboard/pages/home/home';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes')
        .then(m => m.AUTH_ROUTES)
  },

  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },

  // 🔒 protect ALL routes
  {
    path: '',
    canActivateChild: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: Home
      },
      {
        path: 'add',
        loadComponent: () =>
          import('./features/cattle/pages/add/add')
            .then(m => m.Add)
      }
    ]
  }
];
