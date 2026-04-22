import { CommonModule, Location } from '@angular/common';
import { Component } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { addDoc, collection, collectionData, deleteDoc, doc, docData, Firestore, orderBy, query, serverTimestamp, updateDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { filter, firstValueFrom, Observable, switchMap } from 'rxjs';


interface Cattle {
  id?: string;
  name: string;
  type: string;
  dob?: string;
  notes?: string;
}

@Component({
  selector: 'app-events',
  imports: [CommonModule, FormsModule],
  templateUrl: './events.html',
  styleUrl: './events.scss',
})
export class Events {
  cattle$!: Observable<Cattle>;
  cattleId = '';
  events$!: Observable<any[]>;

  // modal state
  selectedEvent: any = null;
  isEditMode = false;

  eventType = '';
  eventName = '';
  eventDate = '';
  eventNotes = '';

  todayDate: string = '';

  fromDate!: string;
  toDate!: string;

  result: any = null;



  constructor(
    private route: ActivatedRoute,
    private firestore: Firestore,
    private auth: Auth,
    private toastr: ToastrService,
    private router: Router,
    private location: Location
  ) { }

  ngOnInit() {
    this.cattleId = this.route.snapshot.paramMap.get('cattleId')!;
    const user = this.auth.currentUser;
    // 🔥 GET CATTLE DETAILS
    this.cattle$ = authState(this.auth).pipe(
      filter(user => !!user),
      switchMap(user => {
        const ref = doc(
          this.firestore,
          `users/${user!.uid}/cattle/${this.cattleId}`
        );
        return docData(ref) as Observable<Cattle>; // ✅ FIX
      })
    );


    this.events$ = authState(this.auth).pipe(
      // 🔥 WAIT until Firebase gives real user
      filter(user => !!user),
      switchMap(user => {
        const q = query(
          collection(this.firestore, `users/${user!.uid}/cattle/${this.cattleId}/events`),
          orderBy('date', 'desc')
        );
        return collectionData(q, { idField: 'id' });
      })
    );

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.todayDate = `${year}-${month}-${day}`;
  }

  openModal(event?: any) {
    this.isEditMode = !!event;
    this.selectedEvent = event || null;

    this.eventType = event?.type || '';
    this.eventName = event?.name || '';
    this.eventDate = event?.date || '';
    this.eventNotes = event?.notes || '';

    const modal = new (window as any).bootstrap.Modal(
      document.getElementById('eventModal')
    );
    modal.show();
  }

  // 🔥 SAVE EVENT
  async saveEvent() {
    try {
      if (!this.eventType || !this.eventName || !this.eventDate) {
        this.toastr.error('Fill required fields');
        return;
      }

      const user = await new Promise<any>((resolve) => {
        const sub = authState(this.auth).subscribe(u => {
          if (u) {
            resolve(u);
            sub.unsubscribe();
          }
        });
      }); if (!user) throw new Error('Not logged in');

      const basePath = `users/${user.uid}/cattle/${this.cattleId}/events`;

      if (this.isEditMode) {
        await updateDoc(
          doc(this.firestore, `${basePath}/${this.selectedEvent.id}`),
          {
            type: this.eventType,
            name: this.eventName,
            date: this.eventDate,
            notes: this.eventNotes,
            updatedAt: serverTimestamp()
          }
        );

        this.toastr.success('Event updated ✏️');

      } else {
        await addDoc(
          collection(this.firestore, basePath),
          {
            type: this.eventType,
            name: this.eventName,
            date: this.eventDate,
            notes: this.eventNotes,
            createdAt: serverTimestamp()
          }
        );

        this.toastr.success('Event added 📅');
      }

      // close modal
      const modal = (window as any).bootstrap.Modal.getInstance(
        document.getElementById('eventModal')
      );
      modal.hide();

    } catch (err) {
      console.error(err);
      this.toastr.error('Failed');
    }
  }

  async deleteEvent(event: any) {
    const confirmDelete = confirm(
      `⚠️ This is no man’s land.\nOnce deleted, this data cannot be recovered.\n\nAre you sure you want to delete "${event.name}" event?`
    ); if (!confirmDelete) return;
    try {
      const user = await firstValueFrom(authState(this.auth));
      if (!user) throw new Error('Not logged in');
      await deleteDoc(
        doc(
          this.firestore,
          `users/${user.uid}/cattle/${this.cattleId}/events/${event.id}`
        )
      );
      this.toastr.success('Event deleted 🗑️');
    } catch (err) {
      console.error(err);
      this.toastr.error('Delete failed');
    }
  }

  goBack() {
    this.location.back()
  }

  openDateCalModal() {
    this.fromDate = ''; this.toDate = ''; this.result = null;
    const modal = new (window as any).bootstrap.Modal(
      document.getElementById('dateCalcModal')
    );
    modal.show();
  }
  calculate() {
    if (!this.fromDate || !this.toDate) return;
    const from = new Date(this.fromDate);
    const to = new Date(this.toDate);
    if (to < from) {
      alert('To Date should be greater than From Date');
      return;
    }
    const diffTime = to.getTime() - from.getTime();
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    let years = to.getFullYear() - from.getFullYear();
    let months = to.getMonth() - from.getMonth();
    let days = to.getDate() - from.getDate();
    if (days < 0) {
      months--;
      const prevMonth = new Date(to.getFullYear(), to.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    const totalMonths = years * 12 + months;
    const weeks = Math.floor(totalDays / 7);
    const remainingDays = totalDays % 7;
    this.result = {
      years,
      months,
      days,
      totalMonths,
      weeks,
      remainingDays,
      totalDays,
      fromFormatted: from.toDateString(),
      toFormatted: to.toDateString()
    };
  }

}
