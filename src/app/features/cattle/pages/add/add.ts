import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { doc, Firestore, getDoc, serverTimestamp, updateDoc } from '@angular/fire/firestore';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { addDoc, collection } from '@angular/fire/firestore';
import { LoaderService } from '../../../../core/services/loader.service';

@Component({
  selector: 'app-add',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add.html',
  styleUrl: './add.scss',
})
export class Add {
  form: any;
  selectedFile: any;
  isSubmitted = false;
  today: string = '';

  // 🔥 EDIT MODE FLAGS
  isEditMode = false;
  cattleId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private router: Router,
    private firestore: Firestore,
    private auth: Auth,
    private loader: LoaderService,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      dob: [''],
      notes: ['']
    });
  }
  async ngOnInit() {
    this.today = new Date().toISOString().split('T')[0];
    // CHECK EDIT MODE
    this.cattleId = this.route.snapshot.paramMap.get('id');

    if (this.cattleId) {
      this.isEditMode = true;
      await this.loadCattleData();
    }
  }

  async loadCattleData() {
    try {
      const user = this.auth.currentUser;
      if (!user) return;

      const docRef = doc(
        this.firestore,
        `users/${user.uid}/cattle/${this.cattleId}`
      );

      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        this.toastr.error('Cattle not found');
        this.router.navigate(['/dashboard']);
        return;
      }
      const data: any = snap.data();
      // PATCH FORM
      this.form.patchValue({
        name: data.name || '',
        type: data.type || '',
        dob: data.dob || '',
        notes: data.notes || ''
      });

    } catch (err) {
      console.error(err);
      this.toastr.error('Failed to load data');
    }
  }


  onFileChange(event: any) {
    // this.selectedFile = event.target.files[0];
    this.toastr.warning('This feature available for paid version only 😜')
  }

  get f() {
    return this.form.controls;
  }

  async onSubmit() {
    this.isSubmitted = true;
    if (this.form.invalid) {
      this.toastr.error('Please fill all required fields');
      return;
    }
    this.loader.show();

    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('Not logged in');
      const payload = {
        ...this.form.value,
        type: this.form.value.type.toLowerCase(),
        updatedAt: serverTimestamp()
      };
      if (this.isEditMode) {
        // 🔥 UPDATE
        await updateDoc(
          doc(this.firestore, `users/${user.uid}/cattle/${this.cattleId}`),
          payload
        );
        this.toastr.success('Cattle updated ✏️');
      } else {
        // 🔥 ADD
        await addDoc(
          collection(this.firestore, `users/${user.uid}/cattle`),
          {
            ...payload,
            createdAt: serverTimestamp()
          }
        );
        this.toastr.success('Cattle added 🐄');
      }
      this.form.reset();
      this.isSubmitted = false;
      this.router.navigate(['/dashboard']);
    } catch (err) {
      console.error(err);
      this.toastr.error('Failed to save');
    } finally {
      this.loader.hide();
    }
  }


  back() {
    this.router.navigate(['/dashboard'])
  }
}
