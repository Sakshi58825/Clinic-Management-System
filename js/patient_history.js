// js/patient_history.js

import { auth, db } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { protectPage } from "./guard.js"; // KEEP
import { ref, get, onValue } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// --- Page Protection ---
protectPage('login.html', ['admin', 'doctor', 'receptionist']); // KEEP

// --- HTML Elements ---
// HATAO: const authStatusMessage = document.getElementById("authStatusMessage"); // Navbar element
const mainContent = document.getElementById("mainContent"); // KEEP

const patientSearchInput = document.getElementById("patientSearchInput"); // KEEP
const patientSelectDropdown = document.getElementById("patientSelectDropdown"); // KEEP
const patientSelectionMessage = document.getElementById("patientSelectionMessage"); // KEEP
const clearSelectionBtn = document.getElementById("clearSelectionBtn"); // KEEP

const patientDetailsSection = document.getElementById("patientDetailsSection"); // KEEP
const patientIdDisplay = document.getElementById("patientIdDisplay"); // KEEP
const patientNameDisplay = document.getElementById("patientNameDisplay"); // KEEP
const patientDobDisplay = document.getElementById("patientDobDisplay"); // KEEP
const patientGenderDisplay = document.getElementById("patientGenderDisplay"); // KEEP
const patientContactDisplay = document.getElementById("patientContactDisplay"); // KEEP
const patientEmailDisplay = document.getElementById("patientEmailDisplay"); // KEEP
const patientAddressDisplay = document.getElementById("patientAddressDisplay"); // KEEP
const patientRegisteredOnDisplay = document.getElementById("patientRegisteredOnDisplay"); // KEEP

const appointmentHistorySection = document.getElementById("appointmentHistorySection"); // KEEP
const patientAppointmentsTableBody = document.getElementById("patientAppointmentsTableBody"); // KEEP
const appointmentsHistoryMessage = document.getElementById("appointmentsHistoryMessage"); // KEEP

const prescriptionHistorySection = document.getElementById("prescriptionHistorySection"); // KEEP
const patientPrescriptionsTableBody = document.getElementById("patientPrescriptionsTableBody"); // KEEP
const prescriptionsHistoryMessage = document.getElementById("prescriptionsHistoryMessage"); // KEEP

// HATAO: Navbar elements (ये सभी अब js/navbar.js द्वारा हैंडल किए जाएंगे)
// const signupNavLinkContainer = document.getElementById("signupNavLinkContainer");
// const loginDropdownContainer = document.getElementById("loginDropdownContainer");
// const profileNavLinkContainer = document.getElementById("profileNavLinkContainer");
// const logoutNavLinkContainer = document.getElementById("logoutNavLinkContainer");

// --- Global Variables ---
let allRegisteredPatients = []; // Stores all patients from DB // KEEP
let currentSelectedPatientId = null; // KEEP

// --- Helper Functions ---
// NOTE: getUserProfile is a common helper. In a full refactor, this could be moved to a shared utility file (e.g., js/utils.js) and imported where needed.
async function getUserProfile(uid) { // KEEP (यह इस पेज के लॉजिक के लिए आवश्यक है)
    try {
        const userProfileRef = ref(db, `users/${uid}`);
        const snapshot = await get(userProfileRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

// HATAO: Update Navbar based on authentication state (ये अब js/navbar.js में है)
// const updateNavbarForAuthState = (user, userName = 'User') => { ... };

// Populate the patient selection dropdown (KEEP)
const populatePatientDropdown = (patientsToDisplay) => {
    if (!patientSelectDropdown) return;

    patientSelectDropdown.innerHTML = '<option value="">-- Select a Patient --</option>';
    if (patientsToDisplay.length === 0) {
        patientSelectionMessage.textContent = "No registered patients found.";
        patientSelectionMessage.style.color = "#ff5722";
    } else {
        patientSelectionMessage.textContent = "Search or select a patient to view their profile.";
        patientSelectionMessage.style.color = "#4CAF50";
        patientsToDisplay.sort((a, b) => a.name.localeCompare(b.name));
        patientsToDisplay.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.patientId;
            option.textContent = `${patient.name} (${patient.patientId})`;
            patientSelectDropdown.appendChild(option);
        });
    }
};

// Display selected patient's personal details (KEEP)
const displayPatientDetails = (patient) => {
    if (!patientDetailsSection) return;

    if (patient) {
        // IMPORTANT: Ensure these fields match your patient data structure (patient.js)
        patientIdDisplay.textContent = patient.id || 'N/A'; // Changed from patient.patientId for consistency with patient_registration.js
        patientNameDisplay.textContent = patient.name || 'N/A';
        patientDobDisplay.textContent = patient.age || 'N/A'; // Changed from patient.dob to patient.age
        patientGenderDisplay.textContent = patient.gender || 'N/A';
        patientContactDisplay.textContent = patient.contact || 'N/A'; // Changed from patient.contactNumber
        patientEmailDisplay.textContent = patient.email || 'N/A';
        patientAddressDisplay.textContent = patient.address || 'N/A';
        patientRegisteredOnDisplay.textContent = patient.registrationTimestamp ? new Date(patient.registrationTimestamp).toLocaleDateString() : 'N/A'; // Changed from patient.registeredOn
        patientDetailsSection.style.display = 'block';
    } else {
        patientDetailsSection.style.display = 'none';
    }
};

// Display selected patient's appointment history (KEEP)
const displayAppointmentHistory = (appointments) => {
    if (!patientAppointmentsTableBody || !appointmentsHistoryMessage) return;

    patientAppointmentsTableBody.innerHTML = '';
    if (appointments.length === 0) {
        appointmentsHistoryMessage.textContent = "No appointment history found for this patient.";
        appointmentsHistoryMessage.style.color = "#6c757d";
    } else {
        appointmentsHistoryMessage.textContent = "";
        appointments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        appointments.forEach(appt => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${appt.doctorName || 'N/A'}</td>
                <td>${appt.date || 'N/A'}</td>
                <td>${appt.time || 'N/A'}</td>
                <td>${appt.reason || 'N/A'}</td>
                <td class="status-${(appt.status || '').toLowerCase()}">${appt.status || 'N/A'}</td>
                <td>${new Date(appt.timestamp).toLocaleDateString() || 'N/A'}</td>
            `;
            patientAppointmentsTableBody.appendChild(row);
        });
    }
    appointmentHistorySection.style.display = 'block';
};

// Display selected patient's prescription history (KEEP)
const displayPrescriptionHistory = (prescriptions) => {
    if (!patientPrescriptionsTableBody || !prescriptionsHistoryMessage) return;

    patientPrescriptionsTableBody.innerHTML = '';
    if (prescriptions.length === 0) {
        prescriptionsHistoryMessage.textContent = "No prescription history found for this patient.";
        prescriptionsHistoryMessage.style.color = "#6c757d";
    } else {
        prescriptionsHistoryMessage.textContent = "";
        prescriptions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        prescriptions.forEach(pres => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${pres.doctorName || 'N/A'}</td>
                <td>${new Date(pres.dateIssued).toLocaleDateString() || 'N/A'}</td>
                <td>${pres.medications || 'N/A'}</td>
                <td>${pres.notes || 'N/A'}</td>
            `;
            patientPrescriptionsTableBody.appendChild(row);
        });
    }
    prescriptionHistorySection.style.display = 'block';
};

// Clear all displayed patient data (KEEP)
const clearPatientData = () => {
    currentSelectedPatientId = null;
    patientSelectDropdown.value = '';
    patientSearchInput.value = '';
    displayPatientDetails(null);
    displayAppointmentHistory([]);
    displayPrescriptionHistory([]);
    patientDetailsSection.style.display = 'none';
    appointmentHistorySection.style.display = 'none';
    prescriptionHistorySection.style.display = 'none';
    populatePatientDropdown(allRegisteredPatients);
};

// Main function to fetch and display data for a selected patient (KEEP)
const fetchAndDisplayPatientData = async (patientId) => {
    if (!patientId) {
        clearPatientData();
        return;
    }

    currentSelectedPatientId = patientId;

    // Fetch Patient Details
    const patientRef = ref(db, `patients/${patientId}`);
    const patientSnapshot = await get(patientRef);
    const patientData = patientSnapshot.exists() ? patientSnapshot.val() : null;
    displayPatientDetails(patientData);

    // Fetch Patient Appointments
    const allAppointmentsRef = ref(db, 'appointments');
    const allAppointmentsSnapshot = await get(allAppointmentsRef);
    const allAppointmentsData = allAppointmentsSnapshot.val();
    const patientAppointments = [];
    if (allAppointmentsData) {
        for (let key in allAppointmentsData) {
            const value = allAppointmentsData[key];
            if (value && typeof value === 'object' && value.patientId === patientId) {
                patientAppointments.push({ ...value });
            } else if (value && typeof value === 'object') {
                for (let subKey in value) {
                    const subValue = value[subKey];
                    if (subValue && typeof subValue === 'object' && subValue.patientId === patientId) {
                        patientAppointments.push({ ...subValue });
                    }
                }
            }
        }
    }
    displayAppointmentHistory(patientAppointments);

    // Fetch Patient Prescriptions
    const prescriptionsRef = ref(db, 'prescriptions');
    const prescriptionsSnapshot = await get(prescriptionsRef);
    const allPrescriptionsData = prescriptionsSnapshot.val();

    console.log("DEBUG: Raw prescriptions data from Firebase:", allPrescriptionsData);

    const patientPrescriptions = [];
    if (allPrescriptionsData) {
        for (let id in allPrescriptionsData) {
            const prescription = allPrescriptionsData[id];
            if (prescription && prescription.patientId === patientId) {
                patientPrescriptions.push(prescription);
            } else {
                console.log(`DEBUG: Skipping prescription ID ${id}. Patient ID mismatch or missing. Pres Patient ID: ${prescription ? prescription.patientId : 'N/A'}, Selected Patient ID: ${patientId}`);
            }
        }
    }
    console.log("DEBUG: Filtered prescriptions for selected patient:", patientPrescriptions);
    displayPrescriptionHistory(patientPrescriptions);
};

// --- Firebase Authentication State Change Listener ---
auth.onAuthStateChanged(async (user) => { // KEEP this block for page-specific logic
    if (user) {
        const userProfile = await getUserProfile(user.uid); // KEEP
        if (!userProfile) { // KEEP
            await signOut(auth); // KEEP
            alert("User profile not found. Please log in again."); // KEEP
            window.location.href = "login.html"; // KEEP
            return; // KEEP
        }

        // HATAO: updateNavbarForAuthState(user, userProfile.name); // अब js/navbar.js इसे हैंडल करता है

        // Display main content after successful authentication and authorization
        if (mainContent) mainContent.style.display = 'block'; // KEEP

        // Fetch all patients on initial load (KEEP)
        const patientsRef = ref(db, 'patients');
        onValue(patientsRef, (snapshot) => {
            const data = snapshot.val();
            allRegisteredPatients = [];
            if (data) {
                for (let id in data) {
                    allRegisteredPatients.push({ patientId: id, ...data[id] });
                }
            }
            populatePatientDropdown(allRegisteredPatients);
            clearPatientData();
        }, (error) => {
            console.error("Error fetching patients:", error);
            patientSelectionMessage.textContent = "Error loading patient list.";
            patientSelectionMessage.style.color = "#ff5722";
        });

    } else {
        // HATAO: updateNavbarForAuthState(null); // अब js/navbar.js इसे हैंडल करता है
        if (mainContent) mainContent.style.display = 'none'; // KEEP
        clearPatientData(); // Clear data if user logs out // KEEP
    }
});

// --- Event Listeners --- (KEEP these, they are page-specific)
if (patientSelectDropdown) {
    patientSelectDropdown.addEventListener('change', (e) => {
        fetchAndDisplayPatientData(e.target.value);
    });
}

if (patientSearchInput) {
    patientSearchInput.addEventListener('keyup', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredPatients = allRegisteredPatients.filter(patient =>
            patient.name.toLowerCase().includes(searchTerm) || patient.patientId.toLowerCase().includes(searchTerm)
        );
        populatePatientDropdown(filteredPatients);
    });
}

if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', clearPatientData);
}

// HATAO: Logout Listener (ये अब js/navbar.js में है)
// if (logoutNavLinkContainer) {
//     logoutNavLinkContainer.addEventListener("click", async (e) => {
//         e.preventDefault();
//         try {
//             await signOut(auth);
//             window.location.href = "index.html";
//         } catch (error) {
//             console.error("Error logging out:", error);
//             alert("Error logging out. Please try again.");
//         }
//     });
// }
