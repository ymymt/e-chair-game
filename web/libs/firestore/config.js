var firebase = require('firebase/app');
var firestore = require('firebase/firestore');

var firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

var getFirestoreApp = async function() {
  var app = firebase.getApps().length ? firebase.getApp() : firebase.initializeApp(firebaseConfig);
  return firestore.getFirestore(app);
};

module.exports = { getFirestoreApp: getFirestoreApp };
