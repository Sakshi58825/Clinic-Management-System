// js/login.js

import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { handleLoginRedirect } from "./guard.js"; // This is still useful
import { ref, get } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// HTML elements for this main login form
const mainLoginForm = document.getElementById("mainLoginForm");
const mainLoginEmailInput = document.getElementById("mainLoginEmail");
const mainLoginPasswordInput = document.getElementById("mainLoginPassword");
const mainRoleSelect = document.getElementById("mainRoleSelect");
const mainLoginMessage = document.getElementById("mainLoginMessage");

// // Navbar elements (Consistent across all pages with a dynamic navbar)
// const authStatusMessage = document.getElementById("authStatusMessage");
// const signupNavLinkContainer = document.getElementById("signupNavLinkContainer");
// const loginDropdownContainer = document.getElementById("loginDropdownContainer");
// const profileNavLinkContainer = document.getElementById("profileNavLinkContainer");
// const logoutNavLinkContainer = document.getElementById("logoutNavLinkContainer");


// Function to get user name from Realtime DB
async function getUserName(uid) {
  try {
    const userProfileRef = ref(db, `users/${uid}`);
    const snapshot = await get(userProfileRef);
    if (snapshot.exists()) {
      return snapshot.val().name || 'User';
    }
    return 'User';
  } catch (error) {
    console.error("Error fetching user name:", error);
    return 'User';
  }
}

// // Function to update Navbar (Consistent across all pages)
// const updateNavbarForAuthState = (user, userName = 'User') => {
//     if (user) {
//         if (authStatusMessage) {
//             authStatusMessage.textContent = `Welcome, ${userName}`;
//             authStatusMessage.style.color = '#81c784';
//         }
//         if (signupNavLinkContainer) signupNavLinkContainer.style.display = 'none';
//         if (loginDropdownContainer) loginDropdownContainer.style.display = 'none';
//         if (profileNavLinkContainer) profileNavLinkContainer.style.display = 'block';
//         if (logoutNavLinkContainer) logoutNavLinkContainer.style.display = 'block';
//     } else {
//         if (authStatusMessage) {
//             authStatusMessage.textContent = '';
//             authStatusMessage.style.color = '#ffeb3b';
//         }
//         if (signupNavLinkContainer) signupNavLinkContainer.style.display = 'block';
//         if (loginDropdownContainer) loginDropdownContainer.style.display = 'block';
//         if (profileNavLinkContainer) profileNavLinkContainer.style.display = 'none';
//         if (logoutNavLinkContainer) logoutNavLinkContainer.style.display = 'none';
//     }
// };

// // Firebase Authentication State Change Listener (For navbar update and immediate redirect if already logged in)
// auth.onAuthStateChanged(async (user) => {
//     if (user) {
//         const userName = await getUserName(user.uid);
//         updateNavbarForAuthState(user, userName);

//         // If user is on this login page and already logged-in, redirect them to index.html
//         if (window.location.pathname.endsWith('login.html')) { // Check if we are on login.html
//             setTimeout(() => {
//                 localStorage.removeItem('redirectAfterLogin'); // Clear any pending redirects
//                 window.location.href = "index.html"; // Always go to home page after login
//             }, 1000); // 1 second delay to see the updated navbar
//         }

//     } else {
//         updateNavbarForAuthState(user); // Update navbar for logged-out state
//     }
// });


// Main Login Form Submission Handler
if (mainLoginForm) { // Ensure the form element was found before adding listener
    mainLoginForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // IMPORTANT: Prevents default form submission (page reload)
        mainLoginMessage.textContent = ""; // Clear previous message

        const email = mainLoginEmailInput.value.trim();
        const password = mainLoginPasswordInput.value;
        const selectedRole = mainRoleSelect.value; // Get the role selected by the user

        // Basic form validation
        if (!email || !password || !selectedRole) {
            mainLoginMessage.textContent = "Please enter email, password, and select your role.";
            mainLoginMessage.style.color = "#ff5722";
            return;
        }

        mainLoginMessage.textContent = "Logging in...";
        mainLoginMessage.style.color = "#ffeb3b";

        try {
            // Actual Firebase Login
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Role verification from Realtime Database
            const userProfileRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(userProfileRef);
            if (snapshot.exists()) {
                const userData = snapshot.val();
                if (userData.role !== selectedRole) { // Check if the registered role matches the selected role
                    await signOut(auth); // Sign out the user immediately if roles don't match
                    mainLoginMessage.textContent = `❌ Access Denied: Your account is registered as ${userData.role}, not ${selectedRole}. Please select the correct role.`;
                    mainLoginMessage.style.color = "#ff5722";
                    return;
                }
            } else {
                // If user profile not found in DB (shouldn't happen if signup is correct)
                await signOut(auth);
                mainLoginMessage.textContent = "❌ Account profile not found. Please sign up or contact support.";
                mainLoginMessage.style.color = "#ff5722";
                console.warn("User profile not found in Realtime DB for UID:", user.uid);
                return;
            }

            // Login successful!
            mainLoginMessage.textContent = "✅ Login successful! Redirecting to Home...";
            mainLoginMessage.style.color = "#4CAF50";

            // Always redirect to home page after successful login from this main login form
            setTimeout(() => {
                localStorage.removeItem('redirectAfterLogin'); // Clear any stored redirect URL
                window.location.href = "index.html"; // Redirect to home page
            }, 1500); // 1.5 second delay to show success message

        } catch (error) {
            console.error("Login Error:", error);
            let errorMessage = "❌ Login failed. Please try again.";

            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = "❌ Invalid email or password.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "❌ Invalid email format.";
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = "❌ Too many failed login attempts. Please try again later.";
            }

            mainLoginMessage.textContent = errorMessage;
            mainLoginMessage.style.color = "#ff5722";
        }
    });
} else {
    console.error("Main Login Form element not found! Check login.html for id='mainLoginForm'");
}

// // Logout functionality (Consistent across all pages with navbar)
// if (logoutNavLinkContainer) {
//     logoutNavLinkContainer.addEventListener("click", async (e) => {
//         e.preventDefault();
//         try {
//             await signOut(auth);
//         } catch (error) {
//             console.error("Error logging out:", error);
//             alert("Error logging out. Please try again.");
//         }
//     });
// }
