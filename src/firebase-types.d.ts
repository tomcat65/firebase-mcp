/**
 * Firebase Type Declarations
 * 
 * This file provides type declarations for Firebase modules
 * to resolve TypeScript errors related to missing type definitions.
 */

declare module 'firebase-admin/firestore' {
  export interface Firestore {
    collection(collectionPath: string): any;
    doc(documentPath: string): any;
    listCollections(): Promise<any[]>;
  }

  export class Timestamp {
    static fromDate(date: Date): Timestamp;
    toDate(): Date;
  }
}

declare module 'firebase-admin/auth' {
  export interface Auth {
    getUser(uid: string): Promise<any>;
    listUsers(maxResults?: number): Promise<any>;
  }
}

declare module 'firebase-admin/storage' {
  export interface Storage {
    bucket(name?: string): any;
  }
}
