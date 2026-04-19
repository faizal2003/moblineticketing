import { Alert } from 'react-native';

export const handleApiError = (error, customMessage = null) => {
  console.error('API Error:', error);
  
  let message = customMessage || 'Something went wrong';
  
  if (error.response) {
    // Server responded with error status
    switch (error.response.status) {
      case 401:
        message = 'Session expired. Please login again.';
        // Optionally dispatch logout action
        break;
      case 403:
        message = 'You are not authorized to perform this action.';
        break;
      case 404:
        message = 'Resource not found.';
        break;
      case 422:
        message = error.response.data.message || 'Validation failed.';
        break;
      case 500:
        message = 'Server error. Please try again later.';
        break;
      default:
        message = error.response.data?.message || 'An error occurred.';
    }
  } else if (error.request) {
    // Request made but no response
    message = 'No response from server. Check your internet connection.';
  }
  
  Alert.alert('Error', message);
  return message;
};