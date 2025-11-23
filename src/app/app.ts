import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationCenterComponent } from './shared/components/notification/notification';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationCenterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'admin-dashboard';
}
