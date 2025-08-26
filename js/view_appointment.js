// js/view_appointment.js

import { auth, db } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"; // NAYA: '=' को 'from' में बदला गया
import { protectPage } from "./guard.js";
import { ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// --- Page Protection ---
protectPage('login.html'); 

// --- HTML Elements ---
const mainContent = document.getElementById("mainContent");
const pageDescription = document.getElementById("pageDescription");
const appointmentsTableBody = document.getElementById("appointmentsTableBody");
const appointmentsMessage = document.getElementById("appointmentsMessage");
const filterDateInput = document.getElementById("filterDate");
const filterDoctorSelect = document.getElementById("filterDoctor");
const filterStatusSelect = document.getElementById("filterStatus");
const searchPatientInput = document.getElementById("searchPatient");
const actionsHeader = document.getElementById("actionsHeader"); 

// --- Global Variables ---
let currentUserRole = null;
let currentDoctorUid = null; 
let allAppointments = []; 
let allDoctors = []; 

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

// Function to populate doctor filter dropdown
async function populateDoctorFilterDropdown() {
    if (!filterDoctorSelect) return;

    try {
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        if (snapshot.exists()) {
            const usersData = snapshot.val();
            allDoctors = []; 
            for (let uid in usersData) {
                const user = usersData[uid];
                if (user.role === 'doctor') {
                    allDoctors.push({ uid, name: user.name || 'Unknown Doctor' });
                }
            }
            allDoctors.sort((a, b) => a.name.localeCompare(b.name));

            filterDoctorSelect.innerHTML = '<option value="all">All Doctors</option>'; 
            allDoctors.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor.uid; 
                option.textContent = doctor.name;
                filterDoctorSelect.appendChild(option);
            });
        } else {
            filterDoctorSelect.innerHTML = '<option value="all">No Doctors Found</option>';
        }
    } catch (error) {
        console.error("Error populating doctor filter dropdown:", error);
    }
}


// Function to display appointments in the table
const displayAppointments = (appointmentsToDisplay) => {
    // NAYA LOG: displayAppointments function के शुरुआत में
    console.log("DISPLAY DEBUG: displayAppointments called with", appointmentsToDisplay.length, "appointments.");
    console.log("DISPLAY DEBUG: Contents of appointmentsToDisplay:", appointmentsToDisplay);


    if (!appointmentsTableBody || !appointmentsMessage) {
        console.error("Required table elements not found for displayAppointments.");
        return;
    }

    appointmentsTableBody.innerHTML = ''; // Clear existing data

    if (appointmentsToDisplay.length === 0) {
        appointmentsMessage.textContent = "No appointments found matching your criteria.";
        appointmentsMessage.style.color = "#ff5722";
        appointmentsTableBody.innerHTML = '';
        return;
    } else {
        appointmentsMessage.textContent = "Appointments loaded successfully.";
        appointmentsMessage.style.color = "#4CAF50";
    }

    appointmentsToDisplay.forEach(appointment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="Patient Name">${appointment.patientName || 'N/A'}</td>
            <td data-label="Doctor Name">${appointment.doctorName || 'N/A'}</td>
            <td data-label="Date">${appointment.date || 'N/A'}</td>
            <td data-label="Time">${appointment.time || 'N/A'}</td>
            <td data-label="Reason">${appointment.reason || 'N/A'}</td>
            <td data-label="Status" class="status-${(appointment.status || '').toLowerCase()}">${appointment.status || 'N/A'}</td>
            <td data-label="Booked On">${new Date(appointment.timestamp).toLocaleString() || 'N/A'}</td>
            <td data-label="Actions" class="appointment-actions">
                ${(currentUserRole === 'admin' || currentUserRole === 'receptionist') || (currentUserRole === 'doctor' && appointment.doctorUid === auth.currentUser.uid) ? `
                    <button class="action-btn confirm-btn" data-appointment-id="${appointment.appointmentId}" data-action="confirm" ${appointment.status === 'Scheduled' ? '' : 'disabled'}>Confirm</button>
                    <button class="action-btn complete-btn" data-appointment-id="${appointment.appointmentId}" data-action="complete" ${appointment.status === 'Confirmed' || appointment.status === 'Scheduled' ? '' : 'disabled'}>Complete</button>
                    <button class="action-btn cancel-btn" data-appointment-id="${appointment.appointmentId}" data-action="cancel" ${appointment.status === 'Scheduled' || appointment.status === 'Confirmed' ? '' : 'disabled'}>Cancel</button>
                ` : ''}
            </td>
        `;
        appointmentsTableBody.appendChild(row);
    });

    // Attach event listeners to action buttons
    document.querySelectorAll('.appointment-actions .action-btn').forEach(button => {
        button.removeEventListener('click', handleActionButtonClick);
        button.addEventListener('click', handleActionButtonClick);
    });

    // Hide actions column if current user is a patient
    if (currentUserRole === 'patient') {
        if (actionsHeader) actionsHeader.style.display = 'none';
        document.querySelectorAll('.appointment-actions').forEach(cell => {
            cell.style.display = 'none';
        });
    } else {
        if (actionsHeader) actionsHeader.style.display = '';
        document.querySelectorAll('.appointment-actions').forEach(cell => {
            cell.style.display = '';
        });
    }
};

// Function to handle status updates
const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
        const appointmentRef = ref(db, `appointments/${appointmentId}`);
        await update(appointmentRef, { status: newStatus });
        console.log(`Appointment ${appointmentId} status updated to ${newStatus}`);
    } catch (error) {
        console.error("Error updating appointment status:", error);
        alert("Failed to update appointment status. Please try again.");
    }
};

// Handle action button clicks
const handleActionButtonClick = (e) => {
    const appointmentId = e.target.dataset.appointmentId;
    const action = e.target.dataset.action;
    const currentAppointment = allAppointments.find(app => app.appointmentId === appointmentId);

    if (!currentAppointment) {
        console.warn("Appointment not found for ID:", appointmentId);
        return;
    }

    if (action === 'confirm') {
        if (currentAppointment.status === 'Scheduled') {
            updateAppointmentStatus(appointmentId, 'Confirmed');
        } else {
            alert("Appointment can only be confirmed if it is in 'Scheduled' status.");
        }
    } else if (action === 'complete') {
        if (currentAppointment.status === 'Scheduled' || currentAppointment.status === 'Confirmed') {
            updateAppointmentStatus(appointmentId, 'Completed');
        } else {
            alert("Appointment can only be completed if it is 'Scheduled' or 'Confirmed'.");
        }
    } else if (action === 'cancel') {
        if (currentAppointment.status === 'Scheduled' || currentAppointment.status === 'Confirmed') {
            if (confirm("Are you sure you want to cancel this appointment?")) {
                updateAppointmentStatus(appointmentId, 'Cancelled');
            }
        } else {
            alert("Appointment can only be cancelled if it is 'Scheduled' or 'Confirmed'.");
        }
    }
};

// Function to filter and search appointments
const filterAndSearchAppointments = () => {
    const filterDate = filterDateInput ? filterDateInput.value : '';
    const filterDoctorUid = filterDoctorSelect ? filterDoctorSelect.value : 'all';
    const filterStatus = filterStatusSelect ? filterStatusSelect.value : 'all'; 
    const searchPatientTerm = searchPatientInput ? searchPatientInput.value.toLowerCase() : '';

    console.log("FILTER DEBUG: Current User Role:", currentUserRole);
    console.log("FILTER DEBUG: Auth Current User UID:", auth.currentUser ? auth.currentUser.uid : 'N/A');
    console.log("FILTER DEBUG: Filter Date:", filterDate);
    console.log("FILTER DEBUG: Filter Doctor UID:", filterDoctorUid);
    console.log("FILTER DEBUG: Filter Status (value from select):", filterStatus); 
    console.log("FILTER DEBUG: Search Patient Term:", searchPatientTerm);

    let filteredAppointments = allAppointments.filter(appointment => {
        const matchesDate = !filterDate || appointment.date === filterDate;
        const matchesDoctor = filterDoctorUid === 'all' || appointment.doctorUid === filterDoctorUid;
        
        // NAYA: Status matching logic को सुरक्षित करें
        // यह सुनिश्चित करता है कि comparison केस-इनसेन्सिटिव हो
        const matchesStatus = (filterStatus === 'all') || 
                              (appointment.status && appointment.status.toLowerCase() === filterStatus.toLowerCase());
        
        const matchesPatientSearch = !searchPatientTerm || (appointment.patientName && appointment.patientName.toLowerCase().includes(searchPatientTerm));
        
        // Apply role-based filtering
        let passesRoleFilter = false;
        if (currentUserRole === 'doctor') {
            passesRoleFilter = appointment.doctorUid === auth.currentUser.uid;
        } else if (currentUserRole === 'patient') {
            passesRoleFilter = appointment.patientId === auth.currentUser.uid;
        } else if (currentUserRole === 'admin' || currentUserRole === 'receptionist') {
            passesRoleFilter = true; // Admin/Receptionist see all
        }

        const overallPasses = matchesDate && matchesDoctor && matchesStatus && matchesPatientSearch && passesRoleFilter;

        console.log(`FILTER DEBUG: Appt ID: ${appointment.appointmentId}, Patient: ${appointment.patientName}, Doctor: ${appointment.doctorName}, Status: ${appointment.status}`);
        console.log(`  - matchesDate: ${matchesDate}, matchesDoctor: ${matchesDoctor}, matchesStatus: ${matchesStatus}, matchesPatientSearch: ${matchesPatientSearch}, passesRoleFilter: ${passesRoleFilter}`);
        console.log(`  - Overall Passes: ${overallPasses}`);
        if (currentUserRole === 'doctor' || currentUserRole === 'patient') {
            console.log(`  - Appt Patient ID: ${appointment.patientId}, Appt Doctor UID: ${appointment.doctorUid}, Auth UID: ${auth.currentUser.uid}`);
        }
        
        return overallPasses;
    });

    console.log("FILTER DEBUG: Contents of filteredAppointments array right after filter:", filteredAppointments);
    console.log("FILTER DEBUG: Final filtered appointments count:", filteredAppointments.length);
    displayAppointments(filteredAppointments);
};

// --- Firebase Authentication State Change Listener ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userProfile = await getUserProfile(user.uid);
        if (!userProfile) {
            await signOut(auth);
            alert("User profile not found. Please log in again.");
            window.location.href = "login.html";
            return;
        }

        currentUserRole = userProfile.role;
        // Store current user's UID as doctorUid if they are a doctor
        if (currentUserRole === 'doctor') {
            currentDoctorUid = user.uid; 
        } else {
            currentDoctorUid = null; // Clear if not a doctor
        }
        
        // Access control for view_appointment page
        if (!['admin', 'receptionist', 'doctor', 'patient'].includes(currentUserRole)) {
            alert("Access Denied: You do not have permission to view appointments.");
            window.location.href = "index.html"; 
            return;
        }

        if (mainContent) mainContent.style.display = 'block';

        // Update page description and filter options based on role
        if (pageDescription) {
            if (currentUserRole === 'doctor') {
                pageDescription.textContent = "View and manage your scheduled appointments.";
                if (filterDoctorSelect) {
                    // Set default filter to current doctor and disable it
                    filterDoctorSelect.value = currentDoctorUid;
                    filterDoctorSelect.disabled = true; 
                    filterDoctorSelect.style.display = ''; // Ensure visible
                }
            } else if (currentUserRole === 'patient') {
                pageDescription.textContent = "View your scheduled appointments.";
                if (filterDoctorSelect) {
                    filterDoctorSelect.style.display = 'none'; // Hide doctor filter for patient role
                }
            } else { // Admin or Receptionist
                pageDescription.textContent = "View and manage all scheduled appointments.";
                if (filterDoctorSelect) {
                    filterDoctorSelect.disabled = false; // Enable doctor filter
                    filterDoctorSelect.style.display = ''; // Ensure visible
                    populateDoctorFilterDropdown(); // Populate for admin/receptionist
                }
            }
        }

        // NAYA: Reset filters to default state on page load for staff roles
        // Patients automatically filter to their own, so no need to reset their visual filters
        if (currentUserRole !== 'patient') { 
            if (filterDateInput) filterDateInput.value = ''; // Clear date filter
            if (filterDoctorSelect) filterDoctorSelect.value = 'all'; // Set doctor to all
            if (filterStatusSelect) filterStatusSelect.value = 'all'; // Set status to all
            if (searchPatientInput) searchPatientInput.value = ''; // Clear patient search
        }


        // Listen for real-time changes in appointments data
        const appointmentsRef = ref(db, 'appointments');
        onValue(appointmentsRef, (snapshot) => {
            const data = snapshot.val();
            console.log("VIEW_APPOINTMENT.JS: Raw appointments data from Firebase:", data); 
            const appointmentsList = [];
            if (data) {
                for (let appointmentId in data) {
                    const appointment = data[appointmentId];
                    if (appointment && typeof appointment === 'object') {
                        appointmentsList.push({ ...appointment });
                    }
                }
            }
            allAppointments = appointmentsList; 
            console.log("VIEW_APPOINTMENT.JS: allAppointments after processing:", allAppointments); 
            filterAndSearchAppointments(); 
            console.log("VIEW_APPOINTMENT.JS: filterAndSearchAppointments called."); 
        }, (error) => {
            console.error("Error fetching appointments:", error);
            if (appointmentsTableBody) appointmentsTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #ff5722;">Error loading appointments.</td></tr>';
        });

    } else {
        // User logged out
        if (mainContent) mainContent.style.display = 'none';
    }
});

// --- Event Listeners for Filters and Search ---
if (filterDateInput) filterDateInput.addEventListener('change', filterAndSearchAppointments);
if (filterDoctorSelect) filterDoctorSelect.addEventListener('change', filterAndSearchAppointments);
if (filterStatusSelect) filterStatusSelect.addEventListener('change', filterAndSearchAppointments);
if (searchPatientInput) searchPatientInput.addEventListener('keyup', filterAndSearchAppointments);
