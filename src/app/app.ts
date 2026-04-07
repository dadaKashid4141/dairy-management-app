import { Component, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { FirebaseService } from './core/services/firebase.service';
import { Header } from './shared/components/header/header';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('dairy-management-app');

  constructor(private firebaseService: FirebaseService, public router: Router) { }
}
