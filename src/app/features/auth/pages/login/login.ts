import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthApi } from '../../services/auth-api';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  loginForm: any;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  errorMsg = '';

  async onSubmit() {
    if (this.loginForm.invalid) return;

    const { email, password } = this.loginForm.value;

    try {
      await this.auth.login(email!, password!);

      // this.toastr.success('Login successful 🎉');
      this.router.navigate(['/dashboard']);

    } catch (err: any) {
      debugger

      if (err.code === 'auth/user-not-found') {
        this.toastr.error('User not found');
      } else if (err.code === 'auth/wrong-password') {
        this.toastr.error('Incorrect password');
      } else if (err.code === 'auth/invalid-email') {
        this.toastr.error('Invalid email');
      } else {
        this.toastr.error('Login failed');
      }

    } finally {
    }
  }

  goToRegister() {
    this.router.navigate(['/auth/register']);
  }

}
