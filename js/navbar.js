// js/navbar.js

import { auth, db } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

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
        console.error("Error fetching user name for navbar:", error);
        return 'User';
    }
}

// Function to update Navbar visibility and user status
const updateNavbarForAuthState = async (user) => {
    // Get all relevant Navbar elements
    const authStatusMessage = document.getElementById("authStatusMessage");
    const signupNavLinkContainer = document.getElementById("signupNavLinkContainer");
    const loginDropdownContainer = document.getElementById("loginDropdownContainer");
    const profileNavLinkContainer = document.getElementById("profileNavLinkContainer");
    const logoutNavLinkContainer = document.getElementById("logoutNavLinkContainer");
    const loginLinkMain = document.querySelector('#loginDropdownContainer .dropdown-menu li a[href="login.html"]'); // Selects the 'Main Login' link


    if (user) {
        // User is logged in
        const userName = await getUserName(user.uid);
        if (authStatusMessage) {
            authStatusMessage.textContent = `Welcome, ${userName}`;
            authStatusMessage.style.color = '#81c784';
        }

        if (signupNavLinkContainer) signupNavLinkContainer.style.display = 'none';
        if (loginDropdownContainer) loginDropdownContainer.style.display = 'none'; // Hide entire login dropdown
        if (profileNavLinkContainer) profileNavLinkContainer.style.display = 'block';
        if (logoutNavLinkContainer) logoutNavLinkContainer.style.display = 'block';
    } else {
        // User is logged out
        if (authStatusMessage) {
            authStatusMessage.textContent = '';
            authStatusMessage.style.color = '#ffeb3b';
        }

        if (signupNavLinkContainer) signupNavLinkContainer.style.display = 'block';
        if (loginDropdownContainer) loginDropdownContainer.style.display = 'block'; // Show entire login dropdown
        // Ensure 'Main Login' is visible within the dropdown if it's there
        if (loginLinkMain) loginLinkMain.style.display = 'block'; 

        if (profileNavLinkContainer) profileNavLinkContainer.style.display = 'none';
        if (logoutNavLinkContainer) logoutNavLinkContainer.style.display = 'none';
    }
};

// --- Firebase Authentication State Change Listener (Centralized) ---
auth.onAuthStateChanged(updateNavbarForAuthState);

// --- Global Logout functionality (Centralized) ---
document.addEventListener("DOMContentLoaded", () => {
    const logoutNavLinkContainer = document.getElementById("logoutNavLinkContainer");
    if (logoutNavLinkContainer) {
        logoutNavLinkContainer.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                // On successful logout, redirect to home page
                window.location.href = "index.html"; 
            } catch (error) {
                console.error("Error logging out:", error);
                alert("Error logging out. Please try again.");
            }
        });
    }
});
