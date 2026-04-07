import { Component, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { FirebaseService } from './core/services/firebase.service';
import { Header } from './shared/components/header/header';
import { CommonModule } from '@angular/common';
import { Loader } from './shared/components/loader/loader';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, CommonModule, Loader],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('dairy-management-app');

  constructor(private firebaseService: FirebaseService, public router: Router) { }
}
