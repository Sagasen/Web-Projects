import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyBJkQk9U0klepRvRLzmKtvvgr7oeE3hRGQ',
  authDomain: 'oriflame-catalog-d7ad5.firebaseapp.com',
  projectId: 'oriflame-catalog-d7ad5',
  storageBucket: 'oriflame-catalog-d7ad5.firebasestorage.app',
  messagingSenderId: '294547780964',
  appId: '1:294547780964:web:103ba8351b78ed4e61f671',
  measurementId: 'G-KLMY35FCG9',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
