import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCBdXVl5-LJW1MMG6rEvsP0ZCMC3gDLkac",
  authDomain: "study-buddy-ed351.firebaseapp.com",
  projectId: "study-buddy-ed351",
  storageBucket: "study-buddy-ed351.firebasestorage.app",
  messagingSenderId: "366961154833",
  appId: "1:366961154833:web:40dd0e6c12ebb53c108ab0"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)