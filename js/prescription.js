// js/prescription.js

import { auth, db } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { protectPage } from "./guard.js"; // KEEP
import { ref, get } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// --- Page Protection ---
protectPage('login.html'); // KEEP

// --- HTML Elements ---
// HATAO: const authStatusMessage = document.getElementById("authStatusMessage"); // Navbar element
const mainContent = document.getElementById("mainContent"); // KEEP
const prescriptionTableBody = document.getElementById("prescriptionTableBody"); // KEEP
const prescriptionMessage = document.getElementById("prescriptionMessage"); // KEEP
const searchPrescriptionInput = document.getElementById("searchPrescriptionInput"); // NEW: Search input // KEEP
const applyPrescriptionFilterBtn = document.getElementById("applyPrescriptionFilterBtn"); // NEW: Search button // KEEP

// HATAO: Navbar elements (ये सभी अब js/navbar.js द्वारा हैंडल किए जाएंगे)
// const signupNavLinkContainer = document.getElementById("signupNavLinkContainer");
// const loginDropdownContainer = document.getElementById("loginDropdownContainer");
// const profileNavLinkContainer = document.getElementById("profileNavLinkContainer");
// const logoutNavLinkContainer = document.getElementById("logoutNavLinkContainer");

// --- Global Variables ---
let currentUserRole = null; // KEEP (इसका उपयोग एक्सेस कंट्रोल में होता है)
let patientIdToFilter = null; // KEEP
let allPrescriptions = []; // NEW: To store all fetched prescriptions for filtering // KEEP
let patientNamesMap = {}; // NEW: To store patient IDs and their names {patientId: "Patient Name"} // KEEP

// --- Helper Functions ---
// KEEP: यह फ़ंक्शन पेज-विशिष्ट लॉजिक में उपयोगकर्ता की भूमिका प्राप्त करने के लिए आवश्यक है।
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

// NEW FUNCTION: Fetch all patient names (KEEP)
async function fetchAllPatientNames(patientIds) {
    const uniquePatientIds = [...new Set(patientIds)];
    const names = {};
    for (const pId of uniquePatientIds) {
        try {
            const patientRef = ref(db, `patients/${pId}`);
            const snapshot = await get(patientRef);
            if (snapshot.exists()) {
                names[pId] = snapshot.val().name || "Unknown Patient";
            } else {
                names[pId] = "Patient Not Found";
            }
        } catch (error) {
            console.error(`Error fetching name for patient ID ${pId}:`, error);
            names[pId] = "Error Fetching Name";
        }
    }
    return names;
}

// HATAO: Update Navbar based on authentication state (ये अब js/navbar.js में है)
// const updateNavbarForAuthState = (user, userName = 'User') => { ... };

// Function to append prescription data to the table (KEEP)
function appendPrescriptionToTable(prescription) {
    const row = document.createElement('tr');
    const patientName = patientNamesMap[prescription.patientId] || 'Loading Name...'; 

    row.innerHTML = `
        <td>${prescription.prescriptionId || 'N/A'}</td>
        <td>${patientName} (${prescription.patientId || 'N/A'})</td> 
        <td>${prescription.doctorName || 'N/A'}</td>
        <td>${prescription.date || 'N/A'}</td>
        <td>${prescription.medicines || 'N/A'}</td>
        <td>${prescription.notes || 'N/A'}</td>
        <td>${new Date(prescription.timestamp).toLocaleString() || 'N/A'}</td>
    `;
    prescriptionTableBody.appendChild(row);
}

// NEW FUNCTION: Display prescriptions in table (after filtering/initial load) (KEEP)
function displayPrescriptionsInTable(prescriptionsToDisplay) {
    if (!prescriptionTableBody) {
        console.error("prescriptionTableBody element not found.");
        return;
    }
    prescriptionTableBody.innerHTML = '';

    if (prescriptionsToDisplay.length === 0) {
        prescriptionMessage.textContent = "No prescriptions found matching your criteria.";
        prescriptionMessage.style.color = "#ff5722";
        return;
    }

    prescriptionsToDisplay.forEach(p => appendPrescriptionToTable(p));
    prescriptionMessage.textContent = "Prescriptions loaded successfully.";
    prescriptionMessage.style.color = "#4CAF50";
}


// Function to fetch and display prescriptions (KEEP)
async function fetchAndDisplayPrescriptions() {
    prescriptionMessage.textContent = "Loading prescriptions...";
    prescriptionMessage.style.color = "#ffeb3b";
    prescriptionTableBody.innerHTML = ''; 
    allPrescriptions = [];

    let prescriptionsRef; 
    let fetchedPatientIds = new Set();

    // IMPORTANT: Assuming the prescription structure in Firebase is like /prescriptions/{prescriptionId}
    // and each prescription object has a patientId field.
    // If your structure is /prescriptions/{patientId}/{prescriptionId}, this part needs adjustment.
    // Based on previous code, it seems your structure might be /prescriptions/{prescriptionId} and then you filter.

    if (currentUserRole === 'patient') {
        // For patients, only fetch their prescriptions directly if stored under their UID or filtered by it
        // The previous code had `ref(db, `prescriptions/${auth.currentUser.uid}`);` which implies
        // prescriptions are directly nested under patient UID. This is an unusual structure for all prescriptions.
        // If all prescriptions are under a single `/prescriptions` node, the filtering must happen client-side or with Firebase queries.
        // For simplicity and based on your add_prescription.js, let's assume it's `/prescriptions/{unique_push_key}`
        // and we filter later. If patient-specific node is used, this needs to be fixed.
        // Assuming /prescriptions/{pushId} and filtering by patientId.
        prescriptionsRef = ref(db, 'prescriptions'); // Fetch all, then filter by current user's UID
    } else if (patientIdToFilter) {
        prescriptionsRef = ref(db, 'prescriptions'); // Fetch all, then filter by patientIdToFilter
    } else {
        prescriptionsRef = ref(db, 'prescriptions'); // Fetch all (for admin/doctor/receptionist)
    }

    try {
        const snapshot = await get(prescriptionsRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Loop through all prescriptions and filter as needed
            for (const id in data) {
                const prescription = data[id];
                // Check if the current user is a patient and this prescription belongs to them
                // OR if a specific patient is being filtered (from patient_details.html)
                // OR if it's an admin/doctor/receptionist viewing all (no specific filter)
                if ((currentUserRole === 'patient' && prescription.patientId === auth.currentUser.uid) ||
                    (patientIdToFilter && prescription.patientId === patientIdToFilter) ||
                    (!patientIdToFilter && currentUserRole !== 'patient')
                ) {
                    allPrescriptions.push(prescription);
                    fetchedPatientIds.add(prescription.patientId);
                }
            }
            
            // NEW: Fetch all patient names
            patientNamesMap = await fetchAllPatientNames(Array.from(fetchedPatientIds));
            
            // NAYA: Initial display based on current filter/search
            applySearchFilter();

        } else {
            prescriptionMessage.textContent = "No prescriptions found in Firebase for this selection.";
            prescriptionMessage.style.color = "#ff5722";
        }
    } catch (error) {
        console.error("PRESCRIPTION.JS: Error fetching prescriptions:", error);
        prescriptionMessage.textContent = `Error loading prescriptions: ${error.message}`;
        prescriptionMessage.style.color = "#ff5722";
    }
}

// NEW FUNCTION: Apply search filter (KEEP)
const applySearchFilter = () => {
    const searchTerm = searchPrescriptionInput ? searchPrescriptionInput.value.toLowerCase() : '';
    
    let filteredList = allPrescriptions.filter(p => {
        const patientName = patientNamesMap[p.patientId] ? patientNamesMap[p.patientId].toLowerCase() : '';
        const doctorName = p.doctorName ? p.doctorName.toLowerCase() : '';
        const medicines = p.medicines ? p.medicines.toLowerCase() : '';
        const notes = p.notes ? p.notes.toLowerCase() : '';

        return patientName.includes(searchTerm) ||
               doctorName.includes(searchTerm) ||
               medicines.includes(searchTerm) ||
               notes.includes(searchTerm);
    });

    displayPrescriptionsInTable(filteredList);
};


// --- Auth State Change ---
auth.onAuthStateChanged(async (user) => { // KEEP this block for page-specific logic
    if (user) {
        const userProfile = await getUserProfile(user.uid); // KEEP
        if (!userProfile) { // KEEP
            await signOut(auth); // KEEP
            alert("User profile not found. Please log in again."); // KEEP
            window.location.href = "login.html"; // KEEP
            return; // KEEP
        }

        currentUserRole = userProfile.role; // KEEP
        // HATAO: updateNavbarForAuthState(user, userProfile.name); // अब js/navbar.js इसे हैंडल करता है

        if (!['doctor', 'admin', 'receptionist', 'patient'].includes(currentUserRole)) { // KEEP
            alert("Access Denied: You do not have permission to view prescriptions."); // KEEP
            window.location.href = "index.html"; // KEEP
            return; // KEEP
        }

        mainContent.style.display = 'block'; // KEEP

        patientIdToFilter = localStorage.getItem('patientIdToViewPrescriptions'); // KEEP
        if (patientIdToFilter) { // KEEP
            localStorage.removeItem('patientIdToViewPrescriptions'); // KEEP
        }

        // Initial fetch and display (KEEP)
        fetchAndDisplayPrescriptions();

    } else {
        // HATAO: updateNavbarForAuthState(null); // अब js/navbar.js इसे हैंडल करता है
        mainContent.style.display = 'none'; // KEEP
        prescriptionMessage.textContent = "Please log in to view prescriptions."; // KEEP
        prescriptionMessage.style.color = "#ff5722"; // KEEP
    }
});

// --- Event Listeners for Search --- (KEEP)
if (applyPrescriptionFilterBtn) {
    applyPrescriptionFilterBtn.addEventListener('click', applySearchFilter);
}
if (searchPrescriptionInput) {
    searchPrescriptionInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            applySearchFilter();
        }
    });
}


// HATAO: --- Logout --- (ये अब js/navbar.js में है)
// logoutNavLinkContainer.addEventListener("click", async (e) => {
//     e.preventDefault();
//     try {
//         await signOut(auth);
//         window.location.href = "index.html";
//     } catch (error) {
//         console.error("Error logging out:", error);
//         alert("Error logging out. Please try again.");
//     }
// });
