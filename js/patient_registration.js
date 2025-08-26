// js/patient_registration.js

console.log("------------------- js/patient_registration.js LOADED -------------------");

import { auth, db } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { protectPage } from "./guard.js";
import { ref, get, set, push } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// NAYA: Global error handler
window.onerror = function(message, source, lineno, colno, error) {
    console.error("Global JavaScript Error:", { message, source, lineno, colno, error });
    alert("An unexpected error occurred. Please check the browser console for details.");
    const mainContent = document.getElementById("mainContent"); 
    if (mainContent) mainContent.style.display = 'block'; 
};
window.onunhandledrejection = function(event) {
    console.error("Global Unhandled Promise Rejection:", event.reason);
    alert("An unexpected promise error occurred. Please check the browser console for details.");
    const mainContent = document.getElementById("mainContent"); 
    if (mainContent) mainContent.style.display = 'block'; 
};


// --- Page Protection ---
protectPage('login.html', ['admin', 'receptionist', 'patient']); 


// --- HTML Elements ---
const registrationForm = document.getElementById("registrationForm");
const patientNameInput = document.getElementById("patientName");
const patientAgeInput = document.getElementById("patientAge");
const patientGenderInput = document.getElementById("patientGender");
const patientContactInput = document.getElementById("patientContact");
const registrationMessage = document.getElementById("registrationMessage");
const mainContent = document.getElementById("mainContent"); 

console.log("PR_DEBUG: registrationForm element found:", !!registrationForm);
console.log("PR_DEBUG: patientNameInput element found:", !!patientNameInput);


// --- Global Variables ---
let currentUserName = null; 
let currentUserUid = null;  

// --- Helper Functions ---
async function getUserProfile(uid) {
    try {
        console.log("PR_DEBUG: Fetching user profile for UID:", uid);
        const userProfileRef = ref(db, `users/${uid}`);
        const snapshot = await get(userProfileRef);
        if (snapshot.exists()) {
            console.log("PR_DEBUG: User profile fetched:", snapshot.val());
            return snapshot.val();
        } else {
            console.warn("PR_DEBUG: User profile not found for UID:", uid);
            return null;
        }
    } catch (error) {
        console.error("PR_ERROR: Error fetching user profile:", error);
        return null;
    }
}

// Function to generate a simple token (e.g., TKN-ABCXYZ)
function generateToken() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = 'TKN-';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// --- Auth State Change ---
auth.onAuthStateChanged(async (user) => {
    try {
        console.log("PR_DEBUG: auth.onAuthStateChanged fired. User:", user ? user.uid : "No user");

        if (user) {
            const userProfile = await getUserProfile(user.uid);
            if (!userProfile) {
                console.error("PR_ERROR: User profile missing after login. Signing out.");
                await signOut(auth);
                alert("User profile not found. Please log in again.");
                window.location.href = "login.html";
                return;
            }

            currentUserName = userProfile.name;
            currentUserUid = user.uid;
            console.log("PR_DEBUG: Logged in user - Name:", currentUserName, "UID:", currentUserUid, "Role:", userProfile.role);

            if (userProfile.role === 'patient') {
                if (patientNameInput) { patientNameInput.value = userProfile.name || ''; patientNameInput.disabled = true; }
                if (patientContactInput) { patientContactInput.value = user.email || ''; patientContactInput.disabled = true; }
            } else if (userProfile.role === 'admin' || userProfile.role === 'receptionist') {
                if (patientNameInput) patientNameInput.disabled = false;
                if (patientContactInput) patientContactInput.disabled = false;
            } else {
                console.warn("PR_DEBUG: Unauthorized role detected:", userProfile.role, "Redirect should have happened by protectPage.");
                alert("Access Denied: You do not have permission to register patients.");
                window.location.href = "index.html";
                return;
            }

        } else { 
            console.log("PR_DEBUG: No user logged in.");
            if (patientNameInput) patientNameInput.disabled = false;
            if (patientContactInput) patientContactInput.disabled = false;
            currentUserName = null;
            currentUserUid = null;
        }

        if (mainContent) {
            mainContent.style.display = 'block';
            console.log("PR_DEBUG: mainContent set to display: block.");
        } else {
            console.error("PR_ERROR: mainContent element not found!");
        }

    } catch (error) {
        console.error("PR_ERROR: Error in auth.onAuthStateChanged block:", error);
        alert("An error occurred during authentication state check. Please check console.");
        if (mainContent) { 
            mainContent.style.display = 'block';
        }
    }
});


// --- Form Submission ---
if (registrationForm) { 
    console.log("PR_DEBUG: Adding event listener to registrationForm."); 
    registrationForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("PR_DEBUG: Form submission event triggered."); 
        registrationMessage.textContent = "";

        const patientName = patientNameInput.value.trim();
        const patientAge = patientAgeInput.value.trim();
        const patientGender = patientGenderInput.value;
        const patientContact = patientContactInput.value.trim();

        if (!patientName || !patientAge || !patientGender || !patientContact) {
            registrationMessage.textContent = "Please fill all required fields.";
            registrationMessage.style.color = "#ff5722";
            return;
        }

        registrationMessage.textContent = "Registering patient...";
        registrationMessage.style.color = "#ffeb3b";

        try {
            const patientsRef = ref(db, 'patients');
            let newPatientRef;
            let patientId;
            let patientAuthUidToStore = null; 

            // NAYA: Simplified and more robust UID handling
            if (auth.currentUser && auth.currentUser.email === patientContact) { 
                // If it's a self-registration (logged-in user registers themselves), 
                // use the user's UID as the key for the patient record.
                newPatientRef = ref(db, `patients/${auth.currentUser.uid}`); 
                patientId = auth.currentUser.uid;
                patientAuthUidToStore = auth.currentUser.uid; // Store the UID in the 'uid' field
                console.log("PR_DEBUG: Self-registration. Using user's UID as record key:", patientId);
            } else {
                // If it's an admin/receptionist registering someone else, use push() for new key.
                newPatientRef = push(patientsRef);
                patientId = newPatientRef.key;
                console.log("PR_DEBUG: Staff registration. Using generated key:", patientId);

                // NAYA: If registering someone else, try to find their Auth UID if they are already a registered user.
                // This assumes 'users' node contains user profiles with email.
                const usersRef = ref(db, 'users'); 
                const usersSnapshot = await get(usersRef);
                if (usersSnapshot.exists()) {
                    usersSnapshot.forEach(childSnapshot => {
                        const userProfile = childSnapshot.val();
                        if (userProfile.email === patientContact && userProfile.uid) { 
                            patientAuthUidToStore = userProfile.uid;
                            console.log("PR_DEBUG: Found existing Auth user for contact:", patientContact, "UID:", patientAuthUidToStore);
                            return true; // break forEach loop
                        }
                    });
                }
            }

            const patientData = {
                id: patientId, 
                name: patientName,
                age: patientAge,
                gender: patientGender,
                contact: patientContact,
                token: generateToken(),
                status: "Waiting", 
                registrationTimestamp: new Date().toISOString()
            };

            // NAYA: Always add the 'uid' field if a corresponding Firebase Auth UID is found/available
            if (patientAuthUidToStore) { 
                 patientData.uid = patientAuthUidToStore; 
                 console.log("PR_DEBUG: Storing patientData.uid as:", patientAuthUidToStore);
            }
            
            console.log("PR_DEBUG: Patient Data to save:", patientData);
            await set(newPatientRef, patientData);

            registrationMessage.textContent = `✅ Patient ${patientName} registered successfully! Your Token is: ${patientData.token}`;
            registrationMessage.style.color = "#4CAF50";

            if (patientNameInput && !patientNameInput.disabled) patientNameInput.value = ''; 
            if (patientAgeInput) patientAgeInput.value = '';
            if (patientGenderInput) patientGenderInput.value = '';
            if (patientContactInput && !patientContactInput.disabled) patientContactInput.value = ''; 

            if (patientAuthUidToStore && auth.currentUser.uid === patientAuthUidToStore) { // If it was a self-registration
                if (confirm("You have successfully registered! Do you want to book an appointment now?")) {
                    window.location.href = "appointment.html";
                } else {
                    window.location.href = "index.html";
                }
            } else { // For staff registrations or if the contact matched an existing auth user
                setTimeout(() => {
                    window.location.href = "patient_queue.html";
                }, 3000);
            }

        } catch (error) {
            console.error("PR_ERROR: Error registering patient:", error);
            registrationMessage.textContent = `❌ Error: ${error.message}`;
            registrationMessage.style.color = "#ff5722";
        }
    });
} else {
    console.warn("PR_WARNING: registrationForm element not found. Event listener not attached."); 
}
