// js/add_prescription.js

import { auth, db } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { protectPage } from "./guard.js";
import { ref, get, set, push } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// --- Page Protection ---
protectPage('login.html', ['doctor']);

// --- HTML Elements ---
const mainContent = document.getElementById("mainContent");

// Patient Display elements
const patientNameDisplay = document.getElementById("patientNameDisplay");
const patientIdDisplay = document.getElementById("patientIdDisplay"); // Hidden input to store patient Firebase Key
const patientAgeDisplay = document.getElementById("patientAgeDisplay");
const patientGenderDisplay = document.getElementById("patientGenderDisplay");

// Prescription Form elements
const addPrescriptionForm = document.getElementById("addPrescriptionForm");
const doctorNameInput = document.getElementById("doctorName");
const prescriptionDateInput = document.getElementById("prescriptionDate");
const medicinesInput = document.getElementById("medicines");
const notesInput = document.getElementById("notes");
const prescriptionMessage = document.getElementById("prescriptionMessage");

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
        console.error("ADD_PRESCRIPTION_ERROR: Error fetching patient details by Firebase Key:", error);
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
        // Note: patient_queue.js must store the Firebase Key, not the Auth UID, for this to work
        currentPatientFirebaseKey = localStorage.getItem('currentPatientIdForPrescription'); 
        console.log("ADD_PRESCRIPTION_DEBUG: currentPatientFirebaseKey from localStorage:", currentPatientFirebaseKey);

        if (!currentPatientFirebaseKey) { 
            alert("Patient ID missing from session. Redirecting back to queue."); 
            localStorage.removeItem('currentPatientIdForPrescription'); 
            window.location.href = "patient_queue.html"; 
            return; 
        }

        // Fetch patient details using the Firebase Database Key
        const patient = await getPatientDetailsByFirebaseKey(currentPatientFirebaseKey); 
        if (!patient) { 
            console.error("ADD_PRESCRIPTION_ERROR: Patient not found for Firebase Key:", currentPatientFirebaseKey);
            alert("Patient details not found in database for this ID. Please ensure patient is correctly registered. Redirecting back to queue."); 
            localStorage.removeItem('currentPatientIdForPrescription'); 
            window.location.href = "patient_queue.html"; 
            return; 
        }

        // Populate patient details on the form
        if (patientNameDisplay) patientNameDisplay.textContent = patient.name || ''; 
        if (patientIdDisplay) patientIdDisplay.value = patient.firebaseKey || ''; // Store the Firebase Key here
        if (patientAgeDisplay) patientAgeDisplay.value = patient.age || ''; 
        if (patientGenderDisplay) patientGenderDisplay.value = patient.gender || ''; 

        // Auto-fill doctor's name
        if (doctorNameInput) doctorNameInput.value = userProfile.name || ''; 

        // Set prescription date to today
        if (prescriptionDateInput) {
            const today = new Date();
            prescriptionDateInput.value = today.toISOString().split('T')[0];
        }

    } else {
        // User logged out
        if (mainContent) mainContent.style.display = 'none'; 
    }
});

// --- Form Submission --- 
if (addPrescriptionForm) {
    addPrescriptionForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (prescriptionMessage) prescriptionMessage.textContent = "";

        const doctorName = doctorNameInput ? doctorNameInput.value.trim() : '';
        const prescriptionDate = prescriptionDateInput ? prescriptionDateInput.value : '';
        const medicines = medicinesInput ? medicinesInput.value.trim() : '';
        const notes = notesInput ? notesInput.value.trim() : '';

        // Get the patient's Firebase Realtime Database Key 
        const patientFirebaseKey = patientIdDisplay ? patientIdDisplay.value : ''; 

        if (!doctorName || !prescriptionDate || !medicines || !patientFirebaseKey) { 
            if (prescriptionMessage) {
                prescriptionMessage.textContent = "Please fill all required fields (Doctor Name, Date, Medicines) and ensure Patient is selected.";
                prescriptionMessage.style.color = "#ff5722";
            }
            return;
        }

        if (prescriptionMessage) {
            prescriptionMessage.textContent = "Saving prescription...";
            prescriptionMessage.style.color = "#ffeb3b";
        }

        try {
            const user = auth.currentUser;
            const prescriptionsRef = ref(db, `prescriptions`); 
            const newPrescriptionRef = push(prescriptionsRef); 

            const prescriptionData = {
                prescriptionId: newPrescriptionRef.key,
                patientFirebaseKey: patientFirebaseKey, // Use the Firebase Key for prescription linking
                // patientAuthUid: currentPatientAuthUid, // No longer storing Auth UID here by default if we're not using it to fetch
                doctorUid: user.uid,
                doctorName,
                dateIssued: prescriptionDate, 
                medications: medicines, 
                notes,
                timestamp: new Date().toISOString()
            };

            await set(newPrescriptionRef, prescriptionData);

            if (prescriptionMessage) {
                prescriptionMessage.textContent = "✅ Prescription added successfully!";
                prescriptionMessage.style.color = "#4CAF50";
            }

            // Clear form fields
            if (medicinesInput) medicinesInput.value = '';
            if (notesInput) notesInput.value = '';
            
            // Clear localStorage item after successful prescription
            localStorage.removeItem('currentPatientIdForPrescription'); 

            // Redirect back to patient queue
            setTimeout(() => {
                window.location.href = "patient_queue.html"; 
            }, 2000);

        } catch (error) {
            console.error("ADD_PRESCRIPTION_ERROR: Error adding prescription:", error);
            if (prescriptionMessage) {
                prescriptionMessage.textContent = `❌ Error: ${error.message}`;
                prescriptionMessage.style.color = "#ff5722";
            }
        }
    });
}
