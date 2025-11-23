import { Component } from '@angular/core';
import { Header } from './components/header/header';
import { Sidebar } from './components/sidebar/sidebar';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [Header, Sidebar, RouterOutlet],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  protected isSidebarCollapsed = false;
  protected isMobileSidebarOpen = false;

  protected onSidebarCollapsed(collapsed: boolean) {
    this.isSidebarCollapsed = collapsed;
  }

  protected toggleMobileSidebar() {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  protected closeMobileSidebar() {
    this.isMobileSidebarOpen = false;
  }
}
