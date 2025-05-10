import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GitInfoService {
  private commitHash: string = '3228371'; // This will be replaced during build

  constructor() {}

  getCommitHash(): string {
    return this.commitHash;
  }
}
