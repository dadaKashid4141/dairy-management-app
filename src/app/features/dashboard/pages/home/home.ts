import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { collection, collectionData, deleteDoc, doc, Firestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { firstValueFrom, Observable, of } from 'rxjs';
import { LoaderService } from '../../../../core/services/loader.service';
import { authState } from '@angular/fire/auth';
import { ToastrService } from 'ngx-toastr';

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
  otherList$!: Observable<any[]>;

  categories: { title: string; type: CattleType; count: number }[] = [
    { title: 'Cows', type: 'cow', count: 0 },
    { title: 'Buffalo', type: 'buffalo', count: 0 },
    { title: 'Goats', type: 'goat', count: 0 }
  ];

  constructor(
    public router: Router,
    private firestore: Firestore,
    private authService: AuthService,
    private loader: LoaderService,
    private toastr: ToastrService,
  ) {
  }

  ngOnInit() {
    this.loadData();
  }

  onCardClick(item: any) {
    this.router.navigate(['/cattle', item.type]);
  }

  addCattle() {
    this.router.navigate(['/add']);
  }

  editOther(item: any) {
    this.router.navigate(['/edit', item.id]);
  }
  // DELETE OTHER
  async deleteOther(item: any) {
    const confirmDelete = confirm(
      `⚠️ This cannot be undone.\nDelete "${item.title}"?`
    );
    if (!confirmDelete) return;

    try {
      const user = await firstValueFrom(authState(this.authService['auth']));
      if (!user) throw new Error('Not logged in');

      await deleteDoc(
        doc(this.firestore, `users/${user.uid}/cattle/${item.id}`)
      );

      this.toastr.success('Deleted successfully 🗑️');

    } catch (err) {
      console.error(err);
      alert('Delete failed');
    }
  }

  loadData() {

    this.loader.show();

    const cattle$ = this.authService.user$.pipe(
      switchMap(user => {
        if (!user) return of([]);
        const ref = collection(this.firestore, `users/${user.uid}/cattle`);
        return collectionData(ref, { idField: 'id' });
      })
    );

    // stop loader
    cattle$.pipe(take(1)).subscribe(() => {
      this.loader.hide();
    });

    // 🔥 CATTLE COUNT (FILTERED)
    this.categories$ = cattle$.pipe(
      map((data: any[]) => {

        const counts: Record<CattleType, number> = {
          cow: 0,
          buffalo: 0,
          goat: 0
        };

        data.forEach(item => {

          // ✅ IGNORE OTHER CATEGORY
          if (item.category === 'other') return;

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

    // 🔥 OTHER LIST
    this.otherList$ = cattle$.pipe(
      map((data: any[]) =>
        data
          .filter(item => item.category === 'other')
          .sort((a, b) => {
            return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
          })
      )
    );
  }
}
