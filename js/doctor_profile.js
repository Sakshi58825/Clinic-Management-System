// js/doctor_profile.js

import { auth, db } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { protectPage } from "./guard.js"; // KEEP
import { ref, get, onValue } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// --- Page Protection ---
// Only Admin and Receptionist can access this page
// Doctor can view, but not edit (future feature)
protectPage('login.html', ['admin', 'receptionist', 'doctor']); // KEEP

// --- HTML Elements ---
// HATAO: const authStatusMessage = document.getElementById("authStatusMessage"); // Navbar element
const mainContent = document.getElementById("mainContent"); // KEEP
const pageDescription = document.getElementById("pageDescription"); // KEEP

// Tab Elements (KEEP these)
const tabButtons = document.querySelectorAll(".tab-button");
const doctorsTabSection = document.getElementById("doctorsTab");
const patientsTabSection = document.getElementById("patientsTab");

// Doctors Tab Elements (KEEP these)
const doctorSearchInput = document.getElementById("doctorSearchInput");
const doctorsTableBody = document.getElementById("doctorsTableBody");
const doctorsMessage = document.getElementById("doctorsMessage");

// Patients Tab Elements (KEEP these)
const patientSearchInput = document.getElementById("patientSearchInput");
const patientsTableBody = document.getElementById("patientsTableBody");
const patientsMessage = document.getElementById("patientsMessage");

// HATAO: Navbar elements (ये सभी अब js/navbar.js द्वारा हैंडल किए जाएंगे)
// const signupNavLinkContainer = document.getElementById("signupNavLinkContainer");
// const loginDropdownContainer = document.getElementById("loginDropdownContainer");
// const profileNavLinkContainer = document.getElementById("profileNavLinkContainer");
// const logoutNavLinkContainer = document.getElementById("logoutNavLinkContainer");

// --- Global Variables ---
let allDoctors = []; // Stores all doctor profiles from DB // KEEP
let allPatients = []; // Stores all patient profiles from DB // KEEP

// --- Helper Functions ---
async function getUserProfile(uid) { // KEEP: यह उपयोगकर्ता के रोल और नाम के लिए आवश्यक है
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
// const updateNavbarForAuthState = (user, userName = 'User') => {
//     if (authStatusMessage) {
//         authStatusMessage.textContent = user ? `Welcome, ${userName}` : '';
//         authStatusMessage.style.color = user ? '#81c784' : '#ffeb3b';
//     }
//     if (signupNavLinkContainer) {
//         signupNavLinkContainer.style.display = user ? 'none' : 'block';
//     }
//     if (loginDropdownContainer) {
//         loginDropdownContainer.style.display = user ? 'none' : 'block';
//     }
//     if (profileNavLinkContainer) {
//         profileNavLinkContainer.style.display = user ? 'block' : 'none';
//     }
//     if (logoutNavLinkContainer) {
//         logoutNavLinkContainer.style.display = user ? 'block' : 'none';
//     }
// };

// --- Display Functions --- (KEEP these, they are page-specific)

// Display Doctors in the table
const displayDoctors = (doctorsToDisplay) => {
    if (!doctorsTableBody || !doctorsMessage) return;

    doctorsTableBody.innerHTML = '';
    if (doctorsToDisplay.length === 0) {
        doctorsMessage.textContent = "No doctors found matching your criteria.";
        doctorsMessage.style.color = "#6c757d";
    } else {
        doctorsMessage.textContent = "";
        doctorsToDisplay.sort((a, b) => a.name.localeCompare(b.name));
        doctorsToDisplay.forEach(doctor => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${doctor.name || 'N/A'}</td>
                <td>${doctor.email || 'N/A'}</td>
                <td>${doctor.role || 'N/A'}</td>
                <td>${doctor.contactNumber || 'N/A'}</td>
                <td>${doctor.specialization || 'N/A'}</td>
                <td>${doctor.registeredOn ? new Date(doctor.registeredOn).toLocaleDateString() : 'N/A'}</td>
                <!-- Future Actions Column -->
                <!-- <td><button class="action-btn-secondary">Edit</button></td> -->
            `;
            doctorsTableBody.appendChild(row);
        });
    }
};

// Display Patients in the table
const displayPatients = (patientsToDisplay) => {
    if (!patientsTableBody || !patientsMessage) return;

    patientsTableBody.innerHTML = '';
    if (patientsToDisplay.length === 0) {
        patientsMessage.textContent = "No patients found matching your criteria.";
        patientsMessage.style.color = "#6c757d";
    } else {
        patientsMessage.textContent = "";
        patientsToDisplay.sort((a, b) => a.name.localeCompare(b.name));
        patientsToDisplay.forEach(patient => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${patient.patientId || 'N/A'}</td>
                <td>${patient.name || 'N/A'}</td>
                <td>${patient.contactNumber || 'N/A'}</td>
                <td>${patient.email || 'N/A'}</td>
                <td>${patient.gender || 'N/A'}</td>
                <td>${patient.dob || 'N/A'}</td>
                <td>${patient.registeredOn ? new Date(patient.registeredOn).toLocaleDateString() : 'N/A'}</td>
                <!-- Future Actions Column -->
                <!-- <td><button class="action-btn-secondary">Edit</button></td> -->
            `;
            patientsTableBody.appendChild(row);
        });
    }
};

// --- Filter and Search Functions --- (KEEP these, they are page-specific)

const filterAndSearchDoctors = () => {
    const searchTerm = doctorSearchInput ? doctorSearchInput.value.toLowerCase() : '';
    const filteredDoctors = allDoctors.filter(doctor =>
        (doctor.name && doctor.name.toLowerCase().includes(searchTerm)) ||
        (doctor.email && doctor.email.toLowerCase().includes(searchTerm)) ||
        (doctor.specialization && doctor.specialization.toLowerCase().includes(searchTerm))
    );
    displayDoctors(filteredDoctors);
};

const filterAndSearchPatients = () => {
    const searchTerm = patientSearchInput ? patientSearchInput.value.toLowerCase() : '';
    const filteredPatients = allPatients.filter(patient =>
        (patient.name && patient.name.toLowerCase().includes(searchTerm)) ||
        (patient.patientId && patient.patientId.toLowerCase().includes(searchTerm)) ||
        (patient.contactNumber && patient.contactNumber.includes(searchTerm))
    );
    displayPatients(filteredPatients);
};

// --- Tab Switching Logic --- (KEEP these, they are page-specific)
const switchTab = (tabId) => {
    tabButtons.forEach(button => button.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));

    const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    const activeSection = document.getElementById(`${tabId}Tab`);

    if (activeButton) activeButton.classList.add('active');
    if (activeSection) activeSection.classList.add('active');
};

// --- Initial Data Fetch --- (KEEP these, they are page-specific)

// Fetch all doctors (users with role 'doctor')
const fetchDoctors = () => {
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
        const usersData = snapshot.val();
        const doctorsList = [];
        if (usersData) {
            for (let uid in usersData) {
                if (usersData[uid].role === 'doctor') {
                    doctorsList.push({ uid, ...usersData[uid] });
                }
            }
        }
        allDoctors = doctorsList;
        filterAndSearchDoctors();
    }, (error) => {
        console.error("Error fetching doctors:", error);
        doctorsMessage.textContent = "Error loading doctors list.";
        doctorsMessage.style.color = "#ff5722";
    });
};

// Fetch all registered patients
const fetchPatients = () => {
    const patientsRef = ref(db, 'patients');
    onValue(patientsRef, (snapshot) => {
        const patientsData = snapshot.val();
        const patientsList = [];
        if (patientsData) {
            for (let patientId in patientsData) {
                patientsList.push({ patientId, ...patientsData[patientId] });
            }
        }
        allPatients = patientsList;
        filterAndSearchPatients();
    }, (error) => {
        console.error("Error fetching patients:", error);
        patientsMessage.textContent = "Error loading patients list.";
        patientsMessage.style.color = "#ff5722";
    });
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

        fetchDoctors(); // Load doctors data // KEEP
        fetchPatients(); // Load patients data // KEEP

        // Set initial active tab (Doctors tab by default) // KEEP
        switchTab('doctors'); // KEEP

    } else {
        // HATAO: updateNavbarForAuthState(null); // अब js/navbar.js इसे हैंडल करता है
        if (mainContent) mainContent.style.display = 'none'; // KEEP
        // Clear data if user logs out (KEEP)
        allDoctors = [];
        allPatients = [];
        displayDoctors([]);
        displayPatients([]);
    }
});

// --- Event Listeners --- (KEEP these, they are page-specific)

// Tab buttons
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        switchTab(tabId);
    });
});

// Search inputs
if (doctorSearchInput) doctorSearchInput.addEventListener('keyup', filterAndSearchDoctors);
if (patientSearchInput) patientSearchInput.addEventListener('keyup', filterAndSearchPatients);

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
