import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '@shared/services';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  loginForm: FormGroup;
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['superadmin@gmail.com', [Validators.required, Validators.email]],
      password: ['P@ssw0rd', [Validators.required, Validators.minLength(8)]],
      rememberMe: [true],
    });
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  onSubmit() {
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const loginData = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password,
    };

    this.authService.login(loginData).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.errorMessage.set(null);
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(
          err?.error?.message || 'Login failed. Please try again.'
        );
      },
    });
  }
}
