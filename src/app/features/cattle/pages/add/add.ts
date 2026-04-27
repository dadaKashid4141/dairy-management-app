import { CommonModule, Location } from '@angular/common';
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

  private categorySub: any;


  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private router: Router,
    private firestore: Firestore,
    private auth: Auth,
    private loader: LoaderService,
    private route: ActivatedRoute,
    private location: Location
  ) {
    this.form = this.fb.group({
      category: ['cattle', Validators.required],
      // cattle
      name: [''],
      type: [''],
      dob: [''],

      // other
      title: [''],
      date: [''],

      // common
      notes: ['']
    });
  }
  async ngOnInit() {
    this.today = new Date().toISOString().split('T')[0];

    // ✅ CATEGORY CHANGE HANDLER (ADD HERE)
    this.categorySub = this.form.get('category')?.valueChanges.subscribe((val: any) => {
      if (val === 'cattle') {
        this.form.patchValue({
          title: '',
          date: ''
        });
      }

      if (val === 'other') {
        this.form.patchValue({
          name: '',
          type: '',
          dob: ''
        });
      }
    });

    // 🔥 EDIT MODE CHECK
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
        this.toastr.error('Record not found');
        this.router.navigate(['/dashboard']);
        return;
      }

      const data: any = snap.data();

      // ✅ IMPORTANT: detect category
      const category = data.category || 'cattle';

      // 🔥 PATCH BASE
      this.form.patchValue({
        category: category,
        notes: data.notes || ''
      });

      // 🐄 CATTLE
      if (category === 'cattle') {
        this.form.patchValue({
          name: data.name || '',
          type: data.type || '',
          dob: data.dob || ''
        });
      }

      // 📌 OTHER
      if (category === 'other') {
        this.form.patchValue({
          title: data.title || '',
          date: data.date || ''
        });
      }

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
    if (this.form.value.category === 'cattle') {
      if (!this.form.value.name || !this.form.value.type) {
        this.toastr.error('Fill cattle details');
        return;
      }
    }

    if (this.form.value.category === 'other') {
      if (!this.form.value.title || !this.form.value.date) {
        this.toastr.error('Fill title and date');
        return;
      }
    }
    if (this.form.invalid) {
      this.toastr.error('Please fill all required fields');
      return;
    }
    this.loader.show();

    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('Not logged in');

      const basePayload = {
        category: this.form.value.category,
        notes: this.form.value.notes || '',
        updatedAt: serverTimestamp()
      };

      const category = this.form.value.category;

      let payload: any = {
        category,
        notes: this.form.value.notes || '',
        updatedAt: serverTimestamp()
      };

      if (category === 'cattle') {
        payload = {
          ...payload,
          name: this.form.value.name,
          type: this.form.value.type.toLowerCase(),
          dob: this.form.value.dob || ''
        };
      }

      if (category === 'other') {
        payload = {
          ...payload,
          title: this.form.value.title,
          date: this.form.value.date
        };
      }
      if (this.isEditMode) {
        // 🔥 UPDATE
        await updateDoc(
          doc(this.firestore, `users/${user.uid}/cattle/${this.cattleId}`),
          payload
        );
        this.toastr.success(category !== 'other' ? 'Cattle updated' : 'Saved sucessfully');
      } else {
        // 🔥 ADD
        await addDoc(
          collection(this.firestore, `users/${user.uid}/cattle`),
          payload
        );
        this.toastr.success(category !== 'other' ? 'Cattle added 🐄' : 'category added');
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
    this.location.back();
  }

  ngOnDestroy() {
    this.categorySub?.unsubscribe();
  }
}
