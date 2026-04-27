import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { collection, collectionData, deleteDoc, doc, Firestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { combineLatest, firstValueFrom, Observable, of } from 'rxjs';
import { LoaderService } from '../../../../core/services/loader.service';
import { authState } from '@angular/fire/auth';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';

type CattleType = 'cow' | 'buffalo' | 'goat';
interface Cattle {
  type: CattleType;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule],
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

  isChatOpen = false;
  userInput = '';
  messages: any[] = [];

  reminders$!: Observable<any[]>;

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
            const aTime =
              a.updatedAt?.seconds ||
              a.createdAt?.seconds ||
              0;
            const bTime =
              b.updatedAt?.seconds ||
              b.createdAt?.seconds ||
              0;
            return bTime - aTime; // latest on top
          })
      )
    );

    // 🔔 REMINDERS (NEW)
    this.reminders$ = cattle$.pipe(
      switchMap((cattleList: any[]) => {
        if (!cattleList.length) return of([]);
        const user = this.authService['auth'].currentUser;
        if (!user) return of([]);
        const observables = cattleList.map(cattle => {
          const eventsRef = collection(
            this.firestore,
            `users/${user.uid}/cattle/${cattle.id}/events`
          );
          return collectionData(eventsRef, { idField: 'id' }).pipe(
            map((events: any[]) =>
              events.map(e => ({
                ...e,
                cattleName: cattle.name,
                cattleId: cattle.id
              }))
            )
          );
        });
        return combineLatest(observables);
      }),
      map((allEventsArrays: any[]) => {
        const allEvents = allEventsArrays.flat();

        const today = new Date().toISOString().split('T')[0];

        return allEvents
          .filter(e =>
            e.reminder?.reminderDate &&
            e.reminder.status === 'pending'
          )
          .map(e => {
            const date = e.reminder.reminderDate;

            let status = 'upcoming';
            if (date === today) status = 'today';
            else if (date < today) status = 'overdue';

            return {
              ...e,
              status
            };
          })
          .sort((a, b) => {
            // 🔥 CUSTOM SORT

            // 1. upcoming & today first
            if (a.status !== 'overdue' && b.status === 'overdue') return -1;
            if (a.status === 'overdue' && b.status !== 'overdue') return 1;

            // 2. within same group → sort by date
            return a.reminder.reminderDate.localeCompare(b.reminder.reminderDate);
          });
      })
    );
  }

  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
  }

  triggerAI() {
    this.toastr.warning('This feature is under development...');
    this.isChatOpen = !this.isChatOpen;
  }

  openCattle(cattleId: string) {
  this.router.navigate(['/events', cattleId]);
}

}
