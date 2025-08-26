// js/profile.js

import { auth, db } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { protectPage } from "./guard.js"; // KEEP
import { ref, get } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// HATAO: protectPage('admin.html'); // This is a general page protection for profile.html, it should likely use login.html as redirect.
// If profile.html is only accessible after login (which it should be), protectPage('login.html'); is more appropriate.
// You might also consider adding roles if only certain roles can view profiles.
protectPage('login.html'); // Recommended general protection for profile page.

const profileEmailSpan = document.getElementById("profileEmail"); // KEEP
const profileNameSpan = document.getElementById("profileName"); // KEEP
const profileCreationDateSpan = document.getElementById("profileCreationDate"); // KEEP
const logoutButton = document.getElementById("logoutButton"); // KEEP: यह specific page का logout button है

// HATAO: Navbar elements (ये सभी अब js/navbar.js द्वारा हैंडल किए जाएंगे)
// const authStatusMessage = document.getElementById("authStatusMessage");
// const signupNavLinkContainer = document.getElementById("signupNavLinkContainer");
// const loginDropdownContainer = document.getElementById("loginDropdownContainer");
// const profileNavLinkContainer = document.getElementById("profileNavLinkContainer");
// const logoutNavLinkContainer = document.getElementById("logoutNavLinkContainer");

// HATAO: Function to get user name from Realtime DB (ये अब js/navbar.js में है, हालांकि नीचे इसका उपयोग किया जा रहा है)
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

auth.onAuthStateChanged(async (user) => { // KEEP this block for page-specific logic
    if (user) {
        // HATAO: const userName = await getUserName(user.uid); // अब js/navbar.js इसे हैंडल करता है (या आप यहां सीधे user.displayName का उपयोग कर सकते हैं यदि Firebase Auth में नाम सेट है, या Firebase DB से पुनः प्राप्त कर सकते हैं)
        // यदि आप Firebase DB से उपयोगकर्ता का नाम प्राप्त करना चाहते हैं, तो आप इसे यहां फिर से प्राप्त कर सकते हैं:
        let userName = 'User';
        try {
            const userProfileRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(userProfileRef);
            if (snapshot.exists()) {
                userName = snapshot.val().name || 'User';
            }
        } catch (error) {
            console.error("Error fetching user profile for profile page:", error);
        }

        // HATAO: Navbar elements handling (ये अब js/navbar.js में है)
        // if (authStatusMessage) {
        //     authStatusMessage.textContent = `Welcome, ${userName}`;
        //     authStatusMessage.style.color = '#81c784';
        // }
        // if (signupNavLinkContainer) signupNavLinkContainer.style.display = 'none';
        // if (loginDropdownContainer) loginDropdownContainer.style.display = 'none';
        // if (profileNavLinkContainer) profileNavLinkContainer.style.display = 'block';
        // if (logoutNavLinkContainer) logoutNavLinkContainer.style.display = 'block';

        if (profileEmailSpan) profileEmailSpan.textContent = user.email; // KEEP
        if (profileNameSpan) profileNameSpan.textContent = userName; // KEEP
        if (profileCreationDateSpan) profileCreationDateSpan.textContent = user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'; // KEEP

    } else {
        // HATAO: Navbar elements handling (ये अब js/navbar.js में है)
        // if (authStatusMessage) authStatusMessage.textContent = '';
        // if (authStatusMessage) authStatusMessage.style.color = '#ffeb3b';
        // if (signupNavLinkContainer) signupNavLinkContainer.style.display = 'block';
        // if (loginDropdownContainer) loginDropdownContainer.style.display = 'block';
        // if (profileNavLinkContainer) profileNavLinkContainer.style.display = 'none';
        // if (logoutNavLinkContainer) logoutNavLinkContainer.style.display = 'none';

        if (profileEmailSpan) profileEmailSpan.textContent = 'N/A'; // KEEP
        if (profileNameSpan) profileNameSpan.textContent = 'N/A'; // KEEP
        if (profileCreationDateSpan) profileCreationDateSpan.textContent = 'N/A'; // KEEP
    }
});

if (logoutButton) { // KEEP this specific page's logout button
    logoutButton.addEventListener("click", async () => {
        try {
            await signOut(auth);
            // On successful logout, redirect to home page, similar to navbar.js
            window.location.href = "index.html";
        } catch (error) {
            console.error("Error logging out:", error);
            alert("Error logging out. Please try again.");
        }
    });
}

// HATAO: Logout Listener (ये अब js/navbar.js में है)
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
