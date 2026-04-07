import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { map, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

type CattleType = 'cow' | 'buffalo' | 'goat';
interface Cattle {
  type: CattleType;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {

  categories$!: Observable<{ title: string; type: CattleType; count: number }[]>;

  categories: { title: string; type: CattleType; count: number }[] = [
    { title: 'Cows', type: 'cow', count: 0 },
    { title: 'Buffalo', type: 'buffalo', count: 0 },
    { title: 'Goats', type: 'goat', count: 0 }
  ];

  constructor(
    public router: Router,
    private firestore: Firestore,
    private authService: AuthService

  ) {

  }

  ngOnInit() {
    this.loadCounts();
  }

  onCardClick(item: any) {
    console.log(item);
    // next → list page
  }

  addCattle() {
    this.router.navigate(['/add']);
  }


  loadCounts() {
    this.categories$ = this.authService.user$.pipe(
      switchMap(user => {
        if (!user) return of([]);

        const ref = collection(this.firestore, `users/${user.uid}/cattle`);
        return collectionData(ref);
      }),
      map((data: any[]) => {

        const counts: Record<CattleType, number> = {
          cow: 0,
          buffalo: 0,
          goat: 0
        };

        data.forEach(item => {
          const type = item.type?.toLowerCase() as CattleType;
          if (type && counts[type] !== undefined) {
            counts[type]++;
          }
        });

        return [
          { title: 'Cows', type: 'cow', count: counts.cow },
          { title: 'Buffalo', type: 'buffalo', count: counts.buffalo },
          { title: 'Goats', type: 'goat', count: counts.goat }
        ];
      })
    );
  }
}
