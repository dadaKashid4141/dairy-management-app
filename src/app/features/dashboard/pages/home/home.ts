import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { collection, collectionData, deleteDoc, deleteField, doc, Firestore, getDocs, orderBy, query, updateDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { BehaviorSubject, combineLatest, firstValueFrom, Observable, of } from 'rxjs';
import { LoaderService } from '../../../../core/services/loader.service';
import { authState } from '@angular/fire/auth';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  filter$ = new BehaviorSubject<'pending' | 'completed'>('pending');

  isDownloading = false;

  constructor(
    public router: Router,
    private firestore: Firestore,
    private authService: AuthService,
    private loader: LoaderService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
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
    this.reminders$ = combineLatest([cattle$, this.filter$]).pipe(
      switchMap(([cattleList, filterStatus]) => {
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
                cattleName: cattle['name'],
                cattleId: cattle['id']
              }))
            )
          );
        });
        return combineLatest(observables).pipe(
          map((allEventsArrays: any[]) => {
            const allEvents = allEventsArrays.flat();
            const today = new Date().toISOString().split('T')[0];
            return allEvents
              .filter(e =>
                e.reminder?.reminderDate &&
                e.reminder.status === filterStatus // 🔥 dynamic filter
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
              .sort((a, b) =>
                a.reminder.reminderDate.localeCompare(b.reminder.reminderDate)
              );
          })
        );
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

  setFilter(status: 'pending' | 'completed') {
    this.filter$.next(status);
  }

  async removeReminder(item: any, event: Event) {
    event.stopPropagation();
    const user = this.authService['auth'].currentUser;
    if (!user) return;
    try {
      const ref = doc(
        this.firestore,
        `users/${user.uid}/cattle/${item.cattleId}/events/${item.id}`
      );
      await updateDoc(ref, {
        reminder: deleteField()
      });
      this.toastr.success('Reminder removed ✅');
    } catch (err) {
      console.error(err);
      this.toastr.error('Failed to remove reminder');
    }
  }

  async updateStatus(item: any, status: 'pending' | 'completed', event: Event) {
    event.stopPropagation();
    const user = this.authService['auth'].currentUser;
    if (!user) return;
    try {
      const ref = doc(
        this.firestore,
        `users/${user.uid}/cattle/${item.cattleId}/events/${item.id}`
      );
      await updateDoc(ref, {
        'reminder.status': status
      });
      this.toastr.success(`Marked as ${status} ✅`);
    } catch (err) {
      console.error(err);
      this.toastr.error('Update failed');
    }
  }



  async downloadCattlePDF() {
    if (this.isDownloading) return;

    this.isDownloading = true;
    this.cdr.detectChanges();
    try {
      const user = this.authService['auth'].currentUser;

      if (!user) {
        throw new Error('User not logged in');
      }

      // Fetch all cattle
      const cattleRef = collection(
        this.firestore,
        `users/${user.uid}/cattle`
      );

      const snapshot = await getDocs(cattleRef);

      const cattleList = await Promise.all(
        snapshot.docs.map(async (cattleDoc) => {

          const cattle: any = {
            id: cattleDoc.id,
            ...cattleDoc.data()
          };

          // Fetch events of this particular cattle
          const eventsRef = collection(
            this.firestore,
            `users/${user.uid}/cattle/${cattle.id}/events`
          );

          const eventsQuery = query(
            eventsRef,
            orderBy('date', 'desc')
          );

          const eventsSnapshot = await getDocs(eventsQuery);

          cattle.events = eventsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          return cattle;
        })
      );

      if (cattleList.length === 0) {
        this.toastr.info('No cattle data available');
        return;
      }

      // Format date
      const formatDate = (date: string) => {
        if (!date) return '-';

        const parts = date.split('-').map(Number);

        if (parts.length !== 3 || parts.some(isNaN)) {
          return date;
        }

        const formatted = new Date(
          parts[0],
          parts[1] - 1,
          parts[2]
        );

        return formatted.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      };

      // Create PDF
      const pdf = new jsPDF('l', 'mm', 'a4');

      const categories = [
        { type: 'cow', title: 'Cows' },
        { type: 'buffalo', title: 'Buffaloes' },
        { type: 'goat', title: 'Goats' }
      ];

      const totalCattle = cattleList.length;

      // PDF Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MY DAIRY', 14, 18);

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text('All Cattle Report', 14, 27);

      pdf.setFontSize(10);
      pdf.text(
        `Generated On: ${new Date().toLocaleDateString('en-IN')}`,
        14,
        35
      );

      pdf.setFont('helvetica', 'bold');
      pdf.text(`Total Animals: ${totalCattle}`, 14, 43);

      let currentY = 52;

      // Category-wise data
      for (const category of categories) {

        const filteredList = cattleList.filter(
          (item: any) =>
            item.type?.toLowerCase() === category.type
        );

        // Skip empty categories
        if (filteredList.length === 0) continue;

        // Category heading
        if (currentY > 180) {
          pdf.addPage();
          currentY = 20;
        }

        pdf.setFontSize(15);
        pdf.setFont('helvetica', 'bold');

        pdf.text(
          `${category.title} (${filteredList.length})`,
          14,
          currentY
        );

        currentY += 8;

        // Individual cattle details
        for (let i = 0; i < filteredList.length; i++) {

          const animal = filteredList[i];

          // Keep animal heading with its table
          if (currentY > 175) {
            pdf.addPage();
            currentY = 20;
          }

          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');

          pdf.text(
            `${i + 1}. ${animal.name || 'Unnamed Animal'}`,
            14,
            currentY
          );

          currentY += 4;

          const events = animal.events || [];

          // Event table
          const tableBody = events.length > 0
            ? events.map((event: any, index: number) => [
              index + 1,
              animal.name || '-',
              formatDate(event.date),
              event.type || '-',
              event.name || '-',
              event.notes || '-'
            ])
            : [
              [
                {
                  content: 'No events found',
                  colSpan: 6,
                  styles: {
                    halign: 'center',
                    textColor: [120, 120, 120]
                  }
                }
              ]
            ];

          autoTable(pdf, {
            startY: currentY,
            head: [[
              'Sr.',
              'Name',
              'Event Date',
              'Event Type',
              'Event Name',
              'Note'
            ]],
            body: tableBody,

            theme: 'grid',

            styles: {
              fontSize: 9,
              cellPadding: 3,
              overflow: 'linebreak',
              valign: 'middle'
            },

            headStyles: {
              fillColor: [35, 145, 65],
              textColor: 255,
              fontStyle: 'bold'
            },

            columnStyles: {
              0: { cellWidth: 12 },
              1: { cellWidth: 48 },
              2: { cellWidth: 30 },
              3: { cellWidth: 30 },
              4: { cellWidth: 40 },
              5: { cellWidth: 'auto' }
            },

            margin: {
              left: 14,
              right: 14
            }
          });

          currentY = (pdf as any).lastAutoTable.finalY + 10;
        }

        currentY += 5;
      }

      // Download PDF
      pdf.save('My-Dairy-All-Cattle-Report.pdf');

      this.toastr.success('PDF downloaded successfully');

    } catch (error) {
      console.error('PDF Download Error:', error);
      this.toastr.error('Failed to generate PDF');
    } finally {
      this.isDownloading = false;
      this.cdr.detectChanges();
    }
  }


}
