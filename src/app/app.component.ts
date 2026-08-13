import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SnipApiService, SnipLink, ApiError } from './snip-api.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  urlInput = '';
  createdLink = signal<SnipLink | null>(null);
  links = signal<SnipLink[]>([]);
  loading = signal(false);
  submitting = signal(false);
  error = signal('');

  constructor(private readonly api: SnipApiService) {}

  ngOnInit(): void {
    this.refreshLinks();
  }

  submit(): void {
    this.error.set('');
    this.createdLink.set(null);

    const trimmed = this.urlInput.trim();
    if (!this.isValidHttpUrl(trimmed)) {
      this.error.set('Please enter a valid http or https URL.');
      return;
    }

    this.submitting.set(true);
    this.api.createLink(trimmed).subscribe({
      next: (created) => {
        this.createdLink.set(created);
        this.urlInput = '';
        this.submitting.set(false);
        this.refreshLinks();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.error.set(this.extractError(err));
      }
    });
  }

  private refreshLinks(): void {
    this.loading.set(true);
    this.api.listLinks().subscribe({
      next: (items) => {
        this.links.set(items);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(this.extractError(err));
      }
    });
  }

  private extractError(err: HttpErrorResponse): string {
    const payload = err.error as ApiError | string | null;
    if (payload && typeof payload === 'object' && payload.error) {
      return payload.error;
    }
    if (typeof payload === 'string' && payload.length > 0) {
      return payload;
    }
    return 'Unable to reach the backend at http://localhost:3000.';
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
