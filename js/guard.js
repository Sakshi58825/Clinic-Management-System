// js/guard.js

import { auth } from "./firebase.js";

// Function to protect a page. Now redirects to login.html by default.
export const protectPage = (redirectUrl = 'login.html') => { // Default redirect to login.html
  auth.onAuthStateChanged((user) => {
    if (!user) {
      // User is NOT logged in, redirect to login page
      localStorage.setItem('redirectAfterLogin', window.location.href);
      window.location.href = redirectUrl;
    }
  });
};

// Function to handle redirection after successful login (from login page's JS)
export const handleLoginRedirect = () => {
    const redirectUrl = localStorage.getItem('redirectAfterLogin');
    if (redirectUrl) {
        localStorage.removeItem('redirectAfterLogin');
        window.location.href = redirectUrl;
    } else {
        window.location.href = "index.html"; // Default redirect if no specific URL
    }
};
