import { CommonModule, Location } from '@angular/common';
import { Component } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, serverTimestamp } from '@angular/fire/firestore';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { addDoc, collection } from '@angular/fire/firestore';

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


  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private router: Router,
    private firestore: Firestore,
    private auth: Auth,
    private location: Location,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      dob: [''],
      notes: ['']
    });
  }
  ngOnInit() {
    this.today = new Date().toISOString().split('T')[0];
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

    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('Not logged in');

      await addDoc(
        collection(this.firestore, `users/${user.uid}/cattle`),
        {
          ...this.form.value,
          type: this.form.value.type.toLowerCase(),
          createdAt: serverTimestamp()
        }
      );

      this.toastr.success('Cattle added 🐄');
      this.form.reset();
      this.isSubmitted = false;
      this.router.navigate(['/dashboard'])
    } catch (err) {
      console.error(err);
      this.toastr.error('Failed to save');
    }
  }


  back() {
    this.location.back();
  }
}
