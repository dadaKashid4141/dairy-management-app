import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  app = initializeApp(environment.firebaseConfig);

  constructor() {
    console.log('Firebase Initialized');
  }
}