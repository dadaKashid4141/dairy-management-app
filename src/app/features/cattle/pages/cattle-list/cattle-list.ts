import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  orderBy,
  query,
  where
} from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { Auth, authState } from '@angular/fire/auth';
import { ToastrService } from 'ngx-toastr';
import { collectionData } from '@angular/fire/firestore';
import { Observable, filter, switchMap } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cattle-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cattle-list.html',
  styleUrl: './cattle-list.scss',
})
export class CattleList implements OnInit {
  cattleList$!: Observable<any[]>;
  type = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private firestore: Firestore,
    private auth: Auth
  ) { }

  ngOnInit() {
    this.type = this.route.snapshot.paramMap.get('type')!;

    this.cattleList$ = authState(this.auth).pipe(

      // 🔥 WAIT until user is available (THIS IS THE FIX)
      filter(user => !!user),

      switchMap(user => {
        const q = query(
          collection(this.firestore, `users/${user!.uid}/cattle`),
          where('type', '==', this.type),
          orderBy('updatedAt', 'desc')
        );

        return collectionData(q, { idField: 'id' });
      })
    );
  }

  edit(item: any) {
    this.router.navigate(['/edit', item.id]);
  }

  async delete(item: any) {
    const confirmDelete = confirm(`Delete ${item.name}?`);
    if (!confirmDelete) return;

    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('Not logged in');

      await deleteDoc(
        doc(this.firestore, `users/${user.uid}/cattle/${item.id}`)
      );

      this.toastr.success('Deleted successfully 🗑️');

    } catch (err) {
      console.error(err);
      this.toastr.error('Delete failed');
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }
  trackById(index: number, item: any) {
    return item.id;
  }

  goToEvents(item: any) {
    this.router.navigate(['/events', item.id]);
  }
}