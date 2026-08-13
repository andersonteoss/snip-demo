import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SnipLink {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

export interface ApiError {
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class SnipApiService {
  private readonly baseUrl = 'http://localhost:3000';

  constructor(private readonly http: HttpClient) {}

  createLink(url: string): Observable<SnipLink> {
    return this.http.post<SnipLink>(`${this.baseUrl}/api/links`, { url });
  }

  listLinks(): Observable<SnipLink[]> {
    return this.http.get<SnipLink[]>(`${this.baseUrl}/api/links`);
  }
}
