// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCD9cLIzOPM6-Fju6NFArFw1tA2ccPuSX0",
  authDomain: "woof-bcf7f.firebaseapp.com",
  projectId: "woof-bcf7f",
  storageBucket: "woof-bcf7f.firebasestorage.app",
  messagingSenderId: "583258973205",
  appId: "1:583258973205:web:8f3c0501d5f8ab54355a1c",
  measurementId: "G-V7F2MXFZ0P"
};
// const firebaseConfig = {
//   apiKey: "AIzaSyCD9cLIzOPM6-Fju6NFArFw1tA2ccPuSX0",
//   authDomain: "woof-bcf7f.firebaseapp.com",
//   projectId: "woof-bcf7f",
//   storageBucket: "woof-bcf7f.firebasestorage.app",
//   messagingSenderId: "583258973205",
//   appId: "1:583258973205:web:8f3c0501d5f8ab54355a1c",
//   measurementId: "G-V7F2MXFZ0P"
// };
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);