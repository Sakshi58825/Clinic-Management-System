// js/admin_login.js

import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { handleLoginRedirect } from "./guard.js"; // KEEP
import { ref, get } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// HTML elements for this form (KEEP these, as they are specific to admin login form)
const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmailInput = document.getElementById("adminEmail");
const adminPasswordInput = document.getElementById("adminPassword");
const adminLoginMessage = document.getElementById("adminLoginMessage");

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

//         if (window.location.pathname.endsWith('admin.html')) { // Check if we are on admin.html
//             setTimeout(() => {
//                 localStorage.removeItem('redirectAfterLogin');
//                 window.location.href = "index.html";
//             }, 1000);
//         }

//     } else {
//         updateNavbarForAuthState(user);
//     }
// });


// Admin Login Form Submission Handler (KEEP this block, it's specific to admin login)
if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        adminLoginMessage.textContent = "";

        const email = adminEmailInput.value.trim();
        const password = adminPasswordInput.value;

        if (!email || !password) {
            adminLoginMessage.textContent = "Please enter email and password.";
            adminLoginMessage.style.color = "#ff5722";
            return;
        }

        adminLoginMessage.textContent = "Logging in as Admin...";
        adminLoginMessage.style.color = "#ffeb3b";

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Role verification - Explicitly check for 'admin' role
            const userProfileRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(userProfileRef);
            if (snapshot.exists()) {
                const userData = snapshot.val();
                if (userData.role !== 'admin') { // Must be 'admin'
                    await signOut(auth);
                    adminLoginMessage.textContent = "❌ Access Denied: This login is for Admins only. Your account is registered as " + userData.role + ".";
                    adminLoginMessage.style.color = "#ff5722";
                    return;
                }
            } else {
                await signOut(auth);
                adminLoginMessage.textContent = "❌ Account profile not found. Please sign up or contact support.";
                adminLoginMessage.style.color = "#ff5722";
                console.warn("User profile not found in Realtime DB for UID:", user.uid);
                return;
            }

            adminLoginMessage.textContent = "✅ Admin Login successful! Redirecting to Home...";
            adminLoginMessage.style.color = "#4CAF50";

            // HATAO: setTimeout redirect logic here (अब handleLoginRedirect() या guard.js इसे हैंडल करेगा)
            // setTimeout(() => {
            //     localStorage.removeItem('redirectAfterLogin');
            //     window.location.href = "index.html";
            // }, 1500);
            
            // NEW: Call handleLoginRedirect from guard.js for consistent redirection
            handleLoginRedirect(); // Call this instead of setTimeout with direct redirect

        } catch (error) {
            console.error("Admin Login Error:", error);
            let errorMessage = "❌ Login failed. Please try again.";

            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = "❌ Invalid email or password.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "❌ Invalid email format.";
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = "❌ Too many failed login attempts. Please try again later.";
            }

            adminLoginMessage.textContent = errorMessage;
            adminLoginMessage.style.color = "#ff5722";
        }
    });
}


// HATAO: Logout functionality (ये अब js/navbar.js में है)
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
