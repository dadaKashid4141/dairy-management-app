import { Injectable } from '@angular/core';
import { Auth, onAuthStateChanged, User, } from '@angular/fire/auth';
import { doc, Firestore, serverTimestamp, setDoc } from '@angular/fire/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private userSubject = new BehaviorSubject<User | null | undefined>(undefined);
  user$ = this.userSubject.asObservable();

  constructor(
    private auth: Auth,
    private db: Firestore
  ) {

    onAuthStateChanged(this.auth, (user) => {
      this.userSubject.next(user);
    });

  }
  getCurrentUser() {
    return this.userSubject.value;
  }


  async register(name: string, mobile: string, email: string, password: string) {
    try {
      const userCred = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      const user = userCred.user;

      await setDoc(doc(this.db, `users/${user.uid}`), {
        uid: user.uid,
        name,
        mobile,
        email: user.email,
        createdAt: serverTimestamp() // 🔥 better
      });

      return user;

    } catch (error) {
      console.error('REGISTER ERROR:', error);
      throw error;
    }
  }

  // ✅ LOGIN
  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  // ✅ LOGOUT
  logout() {
    return signOut(this.auth);
  }

}
