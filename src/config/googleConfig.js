import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Ganti dengan Web Client ID dari Google Cloud Console
const WEB_CLIENT_ID = '814778443431-op9m756q747uu6q27a54d579giq6226m.apps.googleusercontent.com';

export const configureGoogleSignin = () => {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: true,
  });
};

export default { configureGoogleSignin };