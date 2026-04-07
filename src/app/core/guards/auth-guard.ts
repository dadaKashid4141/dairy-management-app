import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, take } from 'rxjs/operators';

export const authGuard = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.user$.pipe(

    // 🔥 WAIT until Firebase responds
    filter(user => user !== undefined),

    take(1),

    map(user => {
      if (user) {
        return true;
      } else {
        router.navigate(['/auth/login']);
        return false;
      }
    })
  );
};