/**
 * Type declarations for firebase-admin modules
 * These declarations help TypeScript understand the structure of firebase-admin imports
 */

declare module 'firebase-admin/firestore' {
  import { FirebaseFirestore } from '@firebase/firestore-types';
  
  export class Firestore implements FirebaseFirestore {
    collection(collectionPath: string): any;
    doc(documentPath: string): any;
    listCollections(): Promise<any[]>;
    [key: string]: any;
  }
  
  export class Timestamp {
    static fromDate(date: Date): Timestamp;
    toDate(): Date;
  }
}

declare module 'firebase-admin/auth' {
  export class Auth {
    getUser(uid: string): Promise<any>;
    listUsers(maxResults?: number): Promise<{ users: any[] }>;
    [key: string]: any;
  }
}

declare module 'firebase-admin/storage' {
  export class Storage {
    bucket(name?: string): any;
    [key: string]: any;
  }
}

declare module 'firebase-admin' {
  export function initializeApp(options: any): any;
  export function app(): any;
  
  export function firestore(): import('firebase-admin/firestore').Firestore;
  export function auth(): import('firebase-admin/auth').Auth;
  export function storage(): import('firebase-admin/storage').Storage;
  
  export namespace credential {
    export function applicationDefault(): any;
    export function cert(serviceAccountPath: string): any;
  }
}
