// js/receptionist_login.js

import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { handleLoginRedirect } from "./guard.js"; // Still needed if you change redirection logic later // KEEP
import { ref, get } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// HTML elements for this form (KEEP these, as they are specific to receptionist login form)
const receptionistLoginForm = document.getElementById("receptionistLoginForm");
const receptionistEmailInput = document.getElementById("receptionistEmail");
const receptionistPasswordInput = document.getElementById("receptionistPassword");
const receptionistLoginMessage = document.getElementById("receptionistLoginMessage");

// HATAO: Navbar elements (Consistent across all pages with a dynamic navbar) (ये सभी अब js/navbar.js द्वारा हैंडल किए जाएंगे)
// const authStatusMessage = document.getElementById("authStatusMessage");
// const signupNavLinkContainer = document.getElementById("signupNavLinkContainer");
// const loginDropdownContainer = document.getElementById("loginDropdownContainer");
// const profileNavLinkContainer = document.getElementById("profileNavLinkContainer");
// const logoutNavLinkContainer = document.getElementById("logoutNavLinkContainer");


// HATAO: Function to get user name from Realtime DB (ये अब js/navbar.js में है)
// async function getUserName(uid) {
//   try {
//     const userProfileRef = ref(db, `users/${uid}`);
//     const snapshot = await get(userProfileRef);
//     if (snapshot.exists()) {
//       return snapshot.val().name || 'User';
//     }
//     return 'User';
//   } catch (error) {
//     console.error("Error fetching user name:", error);
//     return 'User';
//   }
// }

// HATAO: Function to update Navbar (Consistent across all pages) (ये अब js/navbar.js में है)
// const updateNavbarForAuthState = (user, userName = 'User') => { ... };

// HATAO: Firebase Authentication State Change Listener (For navbar update on this page) (ये अब js/navbar.js में है)
// auth.onAuthStateChanged(async (user) => {
//     if (user) {
//         const userName = await getUserName(user.uid);
//         updateNavbarForAuthState(user, userName);

//         if (window.location.pathname.endsWith('receptionist.html')) { // Check for this specific page
//             setTimeout(() => {
//                 localStorage.removeItem('redirectAfterLogin'); // Clear any pending redirects
//                 window.location.href = "index.html"; // Always go to home page after login
//             }, 1000);
//         }

//     } else {
//         updateNavbarForAuthState(user); // Logged-out state ke liye navbar update karein
//     }
// });


// Receptionist Login Form Submission Handler (KEEP this block, it's specific to receptionist login)
if (receptionistLoginForm) {
    receptionistLoginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        receptionistLoginMessage.textContent = ""; // Clear previous message

        const email = receptionistEmailInput.value.trim();
        const password = receptionistPasswordInput.value;

        // Basic form validation
        if (!email || !password) {
            receptionistLoginMessage.textContent = "Please enter email and password.";
            receptionistLoginMessage.style.color = "#ff5722";
            return;
        }

        receptionistLoginMessage.textContent = "Logging in as Receptionist...";
        receptionistLoginMessage.style.color = "#ffeb3b";

        try {
            // Actual Firebase Login
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Role verification - Explicitly check for 'receptionist' role in Realtime DB
            const userProfileRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(userProfileRef);
            if (snapshot.exists()) {
                const userData = snapshot.val();
                if (userData.role !== 'receptionist') { // Check if the registered role is NOT 'receptionist'
                    await signOut(auth); // Sign out the user immediately
                    receptionistLoginMessage.textContent = "❌ Access Denied: This login is for Receptionists only. Your account is registered as " + userData.role + ".";
                    receptionistLoginMessage.style.color = "#ff5722";
                    return;
                }
            } else {
                // If user profile not found in DB (shouldn't happen if signup is correct)
                await signOut(auth);
                receptionistLoginMessage.textContent = "❌ Account profile not found. Please sign up or contact support.";
                receptionistLoginMessage.style.color = "#ff5722";
                console.warn("User profile not found in Realtime DB for UID:", user.uid);
                return;
            }

            // Login successful as Receptionist!
            receptionistLoginMessage.textContent = "✅ Receptionist Login successful! Redirecting to Home...";
            receptionistLoginMessage.style.color = "#4CAF50";

            // HATAO: Always redirect to home page after successful login from this form
            // setTimeout(() => {
            //     localStorage.removeItem('redirectAfterLogin'); // Clear any stored redirect URL
            //     window.location.href = "index.html"; // Redirect to home page
            // }, 1500);

            handleLoginRedirect(); // Call this instead for consistent behavior

        } catch (error) {
            console.error("Receptionist Login Error:", error);
            let errorMessage = "❌ Login failed. Please try again.";

            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = "❌ Invalid email or password.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "❌ Invalid email format.";
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = "❌ Too many failed login attempts. Please try again later.";
            }

            receptionistLoginMessage.textContent = errorMessage;
            receptionistLoginMessage.style.color = "#ff5722";
        }
    });
}

// HATAO: Logout functionality (Consistent across all pages with navbar) (ये अब js/navbar.js में है)
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
