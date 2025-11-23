import { Component, EventEmitter, HostListener, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@shared/services';
import { Admin } from '@shared/interfaces';
import { environment } from '../../../../environments/environment';
import { DialogComponent } from '@shared/components/dialog/dialog';
import { ButtonComponent } from '@shared/components/button/button';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [DialogComponent, ButtonComponent],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  @Output() menuToggle = new EventEmitter<void>();

  protected isProfileMenuOpen = false;
  protected isLogoutDialogOpen = false;
  protected currentAdmin: Admin | undefined;
  protected imageError = false;

  constructor(private router: Router, private authService: AuthService) {
    this.currentAdmin = this.authService.getCurrentUser();
  }

  protected getAdminInitials(): string {
    if (!this.currentAdmin) return 'PD';
    const firstInitial =
      this.currentAdmin.firstName?.charAt(0)?.toUpperCase() || '';
    const lastInitial =
      this.currentAdmin.lastName?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || 'PD';
  }

  protected getAdminImage(): string | undefined {
    if (!this.currentAdmin?.image) return undefined;
    return environment.IMG_URL + this.currentAdmin.image;
  }

  protected onImageError() {
    this.imageError = true;
  }

  protected shouldShowImage(): boolean {
    return !!(this.getAdminImage() && !this.imageError);
  }

  protected toggleProfileMenu(event: MouseEvent) {
    event.stopPropagation();
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  protected onMenuClick(event: MouseEvent) {
    event.stopPropagation();
  }

  protected goToProfile(event?: MouseEvent) {
    event?.stopPropagation();
    this.isProfileMenuOpen = false;
    this.router.navigate(['/dashboard', 'profile']);
  }

  protected openLogoutDialog() {
    this.isLogoutDialogOpen = true;
  }

  protected closeLogoutDialog() {
    this.isLogoutDialogOpen = false;
  }

  protected confirmLogout() {
    this.isLogoutDialogOpen = false;
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.router.navigate(['/login']);
      },
    });
  }

  @HostListener('document:click')
  protected closeProfileMenu() {
    this.isProfileMenuOpen = false;
  }
}
