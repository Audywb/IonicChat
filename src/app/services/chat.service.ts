import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat//firestore';
import firebase from 'firebase/compat/app';
import { switchMap, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import * as CryptoJS from 'crypto-js';

export interface User {
  uid: string;
  email: string;
}
 
export interface Message {
  createdAt: firebase.firestore.FieldValue;
  id: string;
  from: string;
  msg: string;
  fromName: string;
  myMsg: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  currentUser: User = null;

  secretKey = "123456&Descryption";
  constructor(private afAuth: AngularFireAuth, private afs: AngularFirestore) { 
    this.afAuth.onAuthStateChanged((user) => {
      this.currentUser = user;      
    });
  }

  async signup({ email, password }): Promise<any> {
    const credential = await this.afAuth.createUserWithEmailAndPassword(
      email,
      password
    );
    
    console.log('results', credential);
    const uid = credential.user.uid;
 
    return this.afs.doc(
      `users/${uid}`
    ).set({
      uid,
      email: credential.user.email,
    })
  }
 
  signIn({ email, password }) {
    return this.afAuth.signInWithEmailAndPassword(email, password);
  }
 
  signOut(): Promise<void> {
    return this.afAuth.signOut();
  }

  //delete
 
  // Chat functionality
 
addChatMessage(msg) {
  return this.afs.collection('messages').add({
    msg: this.encrypt(msg),
    from: this.currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}
 
getChatMessages() {
  let users = [];
  return this.getUsers().pipe(
    switchMap(res => {
      users = res;
      return this.afs.collection('messages', ref => ref.orderBy('createdAt')).valueChanges({ idField: 'id' }) as Observable<Message[]>;
    }),
    map(messages => {
      for (let m of messages) {          
        m.fromName = this.getUserForMsg(m.from, users);
        m.myMsg = this.currentUser.uid === m.from;
        m.msg= this.decrypt(m.msg);
      }
      console.log('all messages', messages);        
      return messages;
    })
  )
}

private getUsers() {
  return this.afs.collection('users').valueChanges({ idField: 'uid' }) as Observable<User[]>;
}
 
private getUserForMsg(msgFromId, users: User[]): string {    
  for (let usr of users) {
    if (usr.uid == msgFromId) {
      return usr.email;
    }
  }
  return 'Deleted';
}

encrypt(value : string) : string{
  return CryptoJS.AES.encrypt(value, this.secretKey.trim()).toString();
}

decrypt(textToDecrypt : string){
  return CryptoJS.AES.decrypt(textToDecrypt, this.secretKey.trim()).toString(CryptoJS.enc.Utf8);
}

}
