import { getAnalytics, isSupported } from "firebase/analytics";
import { getApps, initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyCMAiPeZmNLbVxPWNxbtE1IJmnGdKM_euY",
  authDomain: "limassol-on-map.firebaseapp.com",
  projectId: "limassol-on-map",
  storageBucket: "limassol-on-map.firebasestorage.app",
  messagingSenderId: "56033428490",
  appId: "1:56033428490:web:ddeb1de63d81a654230bf3",
  measurementId: "G-H2FYWYVVRS",
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

void isSupported().then((ok) => {
  if (ok) getAnalytics(firebaseApp);
});
