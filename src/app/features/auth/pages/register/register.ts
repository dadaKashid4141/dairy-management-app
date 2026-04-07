import { CommonModule } from '@angular/common';
import { Component, NgZone } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  form: any;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private ngZone: NgZone
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }


  async onSubmit() {
    if (this.form.invalid) return;

    const { name, mobile, email, password } = this.form.value;

    try {
      await this.auth.register(name!, mobile!, email!, password!);

      this.toastr.success('Registration successful ✅');
      this.router.navigate(['/auth/login']);

    } catch (err: any) {

      if (err.code === 'auth/email-already-in-use') {
        this.toastr.error('Email already exists');
      } else if (err.code === 'auth/invalid-email') {
        this.toastr.error('Invalid email');
      } else if (err.code === 'auth/weak-password') {
        this.toastr.error('Weak password (min 6 chars)');
      } else {
        this.toastr.error('Something went wrong');
      }

    }
  }



  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
