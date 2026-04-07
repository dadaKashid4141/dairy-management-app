import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LoaderService } from '../../../core/services/loader.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-loader',
  imports: [CommonModule, ],
  templateUrl: './loader.html',
  styleUrl: './loader.scss',
})
export class Loader {

  loading$: Observable<boolean>;

  constructor(
    public loaderService: LoaderService
  ){
    this.loading$ = this.loaderService.loading$;
  }
}
