import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Ganti dengan Web Client ID dari Google Cloud Console
const WEB_CLIENT_ID = '1066628013766-8p7vjoq6jta1hc2rj2ikknnvjsj78386.apps.googleusercontent.com';

export const configureGoogleSignin = () => {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: true,
  });
};

export default { configureGoogleSignin };