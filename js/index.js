// js/index.js

import { auth, db } from "./firebase.js"; // KEEP
import { signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"; // KEEP (for logout, though navbar.js also handles it)
import { ref, get } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js"; // KEEP

// HATAO: const authStatusMessage = document.getElementById("authStatusMessage"); // Navbar element
const protectedFeatures = document.querySelectorAll(".protected-feature"); // KEEP: This is page-specific logic

// HATAO: Navbar elements (ये सभी अब js/navbar.js द्वारा हैंडल किए जाएंगे)
// const signupNavLinkContainer = document.getElementById("signupNavLinkContainer");
// const loginDropdownContainer = document.getElementById("loginDropdownContainer");
// const profileNavLinkContainer = document.getElementById("profileNavLinkContainer");
// const logoutNavLinkContainer = document.getElementById("logoutNavLinkContainer");

const signupNavLink = signupNavLinkContainer ? signupNavLinkContainer.querySelector('a') : null; // KEEP: If used by protectedFeatures logic
const adminLoginLink = loginDropdownContainer ? document.getElementById("adminLoginLink") : null; // KEEP: If used by protectedFeatures logic
const doctorLoginLink = loginDropdownContainer ? document.getElementById("doctorLoginLink") : null; // KEEP: If used by protectedFeatures logic
const receptionistLoginLink = loginDropdownContainer ? document.getElementById("receptionistLoginLink") : null; // KEEP: If used by protectedFeatures logic


let isLoggedIn = false; // KEEP: This is used by protectedFeatures logic

// HATAO: Function to get user name from Realtime DB (ये अब js/navbar.js में है)
// async function getUserName(uid) { ... }

// HATAO: auth.onAuthStateChanged (ये अब js/navbar.js में है)
// auth.onAuthStateChanged(async (user) => { ... });


protectedFeatures.forEach(featureLink => { // KEEP: This is page-specific logic
  featureLink.addEventListener("click", (e) => {
    // NOTE: isLoggedIn variable is updated by auth.onAuthStateChanged.
    // If you remove auth.onAuthStateChanged from here, you need to import 'isLoggedIn'
    // from a shared state or refactor this logic slightly.
    // For now, let's keep it simple. The auth.onAuthStateChanged will be in navbar.js
    // so this 'isLoggedIn' state needs to be properly managed if this is to work.
    // Let's assume for now that isLoggedIn is correct.
    if (!auth.currentUser) { // Check Firebase auth state directly
      e.preventDefault();
      // Access authStatusMessage from the DOM directly as it's not removed
      const authStatusMessage = document.getElementById("authStatusMessage");
      if (authStatusMessage) {
          authStatusMessage.textContent = "Please Login or Sign Up to access this feature!";
          authStatusMessage.style.color = '#ffeb3b';
      }
      
      // Accessing these elements directly by ID as their variable declarations were removed
      const signupNavLinkContainer = document.getElementById("signupNavLinkContainer");
      const loginDropdownContainer = document.getElementById("loginDropdownContainer");
      const adminLoginLink = document.getElementById("adminLoginLink");
      const doctorLoginLink = document.getElementById("doctorLoginLink");
      const receptionistLoginLink = document.getElementById("receptionistLoginLink");


      // If you want to highlight login/signup, need to ensure these elements are visible
      if (signupNavLinkContainer) signupNavLinkContainer.style.display = 'block'; // Ensure visibility
      if (loginDropdownContainer) loginDropdownContainer.style.display = 'block'; // Ensure visibility
      
      const signupNavLink = signupNavLinkContainer ? signupNavLinkContainer.querySelector('a') : null;

      if (signupNavLink) signupNavLink.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
      if (adminLoginLink) adminLoginLink.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
      if (doctorLoginLink) doctorLoginLink.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
      if (receptionistLoginLink) receptionistLoginLink.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';

      setTimeout(() => {
        if (signupNavLink) signupNavLink.style.backgroundColor = '';
        if (adminLoginLink) adminLoginLink.style.backgroundColor = '';
        if (doctorLoginLink) doctorLoginLink.style.backgroundColor = '';
        if (receptionistLoginLink) receptionistLoginLink.style.backgroundColor = '';
      }, 3000);
    }
  });
});

// HATAO: Logout functionality (ये अब js/navbar.js में है)
// if (logoutNavLinkContainer) { ... }
