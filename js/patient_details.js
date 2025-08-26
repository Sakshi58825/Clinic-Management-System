// js/patient_details.js

import { auth, db } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { protectPage } from "./guard.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// --- Page Protection ---
protectPage('login.html', ['admin', 'doctor', 'receptionist']);

// --- HTML Elements ---
const mainContent = document.getElementById("mainContent");
const patientDetailsContainer = document.getElementById("patientDetailsContainer"); // Assuming a div to show details
const patientNameElement = document.getElementById("patientName");
const patientAgeElement = document.getElementById("patientAge");
const patientGenderElement = document.getElementById("patientGender");
const patientContactElement = document.getElementById("patientContact");
const patientTokenElement = document.getElementById("patientToken");
const patientStatusElement = document.getElementById("patientStatus");
const patientRegistrationDateElement = document.getElementById("patientRegistrationDate");

// --- Global Variables ---
let currentPatientFirebaseKey = null; // Changed to store Firebase Key, not Auth UID

// --- Helper Functions ---
async function getUserProfile(uid) {
    try {
        const userProfileRef = ref(db, `users/${uid}`);
        const snapshot = await get(userProfileRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

// Function to get patient details directly by their Firebase Realtime Database Key
async function getPatientDetailsByFirebaseKey(firebaseKey) { 
    try {
        const patientRef = ref(db, `patients/${firebaseKey}`); // Access patient directly by key
        const snapshot = await get(patientRef);
        if (snapshot.exists()) {
            return { firebaseKey: firebaseKey, ...snapshot.val() }; // Return the patient data
        }
        return null; // Patient not found
    } catch (error) {
        console.error("DETAILS_ERROR: Error fetching patient details by Firebase Key:", error);
        return null;
    }
}

// --- Auth State Change ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userProfile = await getUserProfile(user.uid);
        if (!userProfile) {
            await signOut(auth);
            alert("User profile not found. Please log in again.");
            window.location.href = "login.html";
            return;
        }

        if (mainContent) mainContent.style.display = 'block';

        // Get the patient's Firebase Key from localStorage (passed from patient_queue.js)
        currentPatientFirebaseKey = localStorage.getItem('currentPatientIdForDetails'); 
        console.log("DETAILS_DEBUG: currentPatientFirebaseKey from localStorage:", currentPatientFirebaseKey);

        if (!currentPatientFirebaseKey) {
            alert("Patient ID missing from session. Redirecting back to queue.");
            localStorage.removeItem('currentPatientIdForDetails');
            window.location.href = "patient_queue.html";
            return;
        }

        const patient = await getPatientDetailsByFirebaseKey(currentPatientFirebaseKey);
        if (!patient) {
            console.error("DETAILS_ERROR: Patient not found for Firebase Key:", currentPatientFirebaseKey);
            alert("Patient details not found in database for this ID. Please ensure patient is correctly registered. Redirecting back to queue.");
            localStorage.removeItem('currentPatientIdForDetails');
            window.location.href = "patient_queue.html";
            return;
        }

        // Populate details on the page
        if (patientNameElement) patientNameElement.textContent = patient.name || 'N/A';
        if (patientAgeElement) patientAgeElement.textContent = patient.age || 'N/A';
        if (patientGenderElement) patientGenderElement.textContent = patient.gender || 'N/A';
        if (patientContactElement) patientContactElement.textContent = patient.contact || 'N/A';
        if (patientTokenElement) patientTokenElement.textContent = patient.token || 'N/A';
        if (patientStatusElement) patientStatusElement.textContent = patient.status || 'N/A';
        if (patientRegistrationDateElement) patientRegistrationDateElement.textContent = new Date(patient.registrationTimestamp).toLocaleDateString() || 'N/A';

        // If you have a specific div to show details, make it visible
        if (patientDetailsContainer) patientDetailsContainer.style.display = 'block';

    } else {
        // User logged out
        if (mainContent) mainContent.style.display = 'none';
    }
});
