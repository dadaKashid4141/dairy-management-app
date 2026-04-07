import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink],
  standalone: true,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  constructor(
    private auth: AuthService,
    private router: Router
  ) { }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
