const firebaseConfig = {
  apiKey: "AIzaSyAoka6cOr4YKKSLdG25b2kxBFabHOdOe78",
  authDomain: "matrimony-kerala.firebaseapp.com",
  databaseURL: "https://matrimony-kerala-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "matrimony-kerala",
  storageBucket: "matrimony-kerala.firebasestorage.app",
  messagingSenderId: "491761801178",
  appId: "1:491761801178:web:613eebb149afd689cd92e3",
  measurementId: "G-PRWDVSQ4SB"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

const googleProvider = new firebase.auth.GoogleAuthProvider();

window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
  'size': 'invisible',
  'callback': function(response) {
    console.log('reCAPTCHA verified');
  }
});

auth.useDeviceLanguage();