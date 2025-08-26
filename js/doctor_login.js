// js/doctor_login.js

import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { handleLoginRedirect } from "./guard.js"; // Still needed if you change redirection logic later // KEEP
import { ref, get } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// HTML elements for this form (KEEP these, as they are specific to doctor login form)
const doctorLoginForm = document.getElementById("doctorLoginForm");
const doctorEmailInput = document.getElementById("doctorEmail");
const doctorPasswordInput = document.getElementById("doctorPassword");
const doctorLoginMessage = document.getElementById("doctorLoginMessage");

// HATAO: Navbar elements (ये सभी अब js/navbar.js द्वारा हैंडल किए जाएंगे)
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

// HATAO: Function to update Navbar (ये अब js/navbar.js में है)
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

// HATAO: Firebase Authentication State Change Listener (ये अब js/navbar.js में है)
// auth.onAuthStateChanged(async (user) => {
//     if (user) {
//         const userName = await getUserName(user.uid);
//         updateNavbarForAuthState(user, userName);

//         if (window.location.pathname.endsWith('doctor.html')) { // Check for this specific page
//             setTimeout(() => {
//                 localStorage.removeItem('redirectAfterLogin'); // Clear any pending redirects
//                 window.location.href = "index.html"; // Always go to home page after login
//             }, 1000);
//         }

//     } else {
//         updateNavbarForAuthState(user); // Logged-out state ke liye navbar update karein
//     }
// });


// Doctor Login Form Submission Handler (KEEP this block, it's specific to doctor login)
if (doctorLoginForm) {
    doctorLoginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        doctorLoginMessage.textContent = ""; // Clear previous message

        const email = doctorEmailInput.value.trim();
        const password = doctorPasswordInput.value;

        // Basic form validation
        if (!email || !password) {
            doctorLoginMessage.textContent = "Please enter email and password.";
            doctorLoginMessage.style.color = "#ff5722";
            return;
        }

        doctorLoginMessage.textContent = "Logging in as Doctor...";
        doctorLoginMessage.style.color = "#ffeb3b";

        try {
            // Actual Firebase Login
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // NAYA: Role verification - Explicitly check for 'doctor' role in Realtime DB
            const userProfileRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(userProfileRef);
            if (snapshot.exists()) {
                const userData = snapshot.val();
                if (userData.role !== 'doctor') { // Check if the registered role is NOT 'doctor'
                    await signOut(auth); // Sign out the user immediately
                    doctorLoginMessage.textContent = "❌ Access Denied: This login is for Doctors only. Your account is registered as " + userData.role + ".";
                    doctorLoginMessage.style.color = "#ff5722";
                    return;
                }
            } else {
                // If user profile not found in DB (shouldn't happen if signup is correct)
                await signOut(auth);
                doctorLoginMessage.textContent = "❌ Account profile not found. Please sign up or contact support.";
                doctorLoginMessage.style.color = "#ff5722";
                console.warn("User profile not found in Realtime DB for UID:", user.uid);
                return;
            }

            // Login successful as Doctor!
            doctorLoginMessage.textContent = "✅ Doctor Login successful! Redirecting to Home...";
            doctorLoginMessage.style.color = "#4CAF50";

            // HATAO: setTimeout redirect logic here (अब handleLoginRedirect() या guard.js इसे हैंडल करेगा)
            // setTimeout(() => {
            //     localStorage.removeItem('redirectAfterLogin'); // Clear any pending redirects
            //     window.location.href = "index.html"; // Redirect to home page
            // }, 1500);

            // Call handleLoginRedirect from guard.js for consistent redirection
            handleLoginRedirect();

        } catch (error) {
            console.error("Doctor Login Error:", error);
            let errorMessage = "❌ Login failed. Please try again.";

            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = "❌ Invalid email or password.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "❌ Invalid email format.";
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = "❌ Too many failed login attempts. Please try again later.";
            }

            doctorLoginMessage.textContent = errorMessage;
            doctorLoginMessage.style.color = "#ff5722";
        }
    });
}

// HATAO: NAYA: Logout functionality (Consistent across all pages with navbar) (ये अब js/navbar.js में है)
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
