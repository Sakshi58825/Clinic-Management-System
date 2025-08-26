// js/patient_queue.js - Updated to show ALL Appointments for staff (no "today's date" filter on fetch)

import { auth, db } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { protectPage } from "./guard.js"; 
import { ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// --- Page Protection ---
// Only Admin, Doctor, Receptionist can access this page
protectPage('login.html', ['admin', 'doctor', 'receptionist']); 

// --- HTML Elements ---
const mainContent = document.getElementById("mainContent");
const patientTableBody = document.getElementById("patientTableBody"); // This will now display appointments
const searchPatientInput = document.getElementById("searchPatientInput");
const filterStatusSelect = document.getElementById("filterStatusSelect"); // This will filter queue statuses
const applyFilterBtn = document.getElementById("applyFilterBtn"); 
const noPatientsMessage = document.getElementById("noPatientsMessage"); 
// NAYA: Date filter input for patient queue
const filterDateInput = document.getElementById("filterDateQueue"); 

// --- Global Variables ---
let currentUserRole = null;
let allAppointmentsForQueue = []; 

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

// Function to display appointments in the queue table
const displayAppointmentsInQueue = (appointmentsToDisplay) => {
    // NAYA LOG:
    console.log("QUEUE DISPLAY DEBUG: displayAppointmentsInQueue called with", appointmentsToDisplay.length, "appointments.");

    if (!patientTableBody) { 
        console.error("patientTableBody (appointments queue table) element not found.");
        return;
    }

    patientTableBody.innerHTML = ''; // Clear existing data

    if (appointmentsToDisplay.length === 0) {
        if (noPatientsMessage) noPatientsMessage.style.display = 'block';
        return;
    } else {
        if (noPatientsMessage) noPatientsMessage.style.display = 'none';
    }

    appointmentsToDisplay.forEach(appointment => {
        // Map appointment status to queue-friendly display status
        let queueStatusDisplay = 'Unknown';
        let statusClass = '';

        // NAYA: If status is from old "shedules" change it to "Scheduled" for display
        const currentApptStatus = (appointment.status === 'shedules' ? 'Scheduled' : appointment.status);

        if (currentApptStatus === 'Scheduled' || currentApptStatus === 'Confirmed') {
            queueStatusDisplay = 'Waiting';
            statusClass = 'status-waiting';
        } else if (currentApptStatus === 'In Consultation') {
            queueStatusDisplay = 'In Consultation';
            statusClass = 'status-in-consultation';
        } else if (currentApptStatus === 'Completed') {
            queueStatusDisplay = 'Completed';
            statusClass = 'status-completed'; 
        } else if (currentApptStatus === 'Cancelled') {
            queueStatusDisplay = 'Cancelled';
            statusClass = 'status-cancelled'; 
        } else {
            queueStatusDisplay = currentApptStatus; // Fallback for other statuses
            statusClass = `status-${currentApptStatus.toLowerCase().replace(/\s+/g, '-')}`;
        }

        // NAYA: patientIdToUse will ALWAYS be the appointment.id (Firebase Realtime Database Key)
        // This makes it compatible with add_prescription.js and patient_details.js that use getPatientDetailsByFirebaseKey
        const patientIdToUse = appointment.id; // Changed from appointment.patientUid || appointment.id; 

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${appointment.time || 'N/A'}</td>
            <td>${appointment.patientName || 'N/A'}</td>
            <td>${appointment.doctorName || 'N/A'}</td>
            <td>${appointment.date || 'N/A'}</td> <!-- NAYA: Add date column -->
            <td>${appointment.reason || 'N/A'}</td>
            <td class="${statusClass}">${queueStatusDisplay}</td>
            <td>
                <button class="action-btn start-btn" data-appointment-id="${appointment.appointmentId}" 
                    ${queueStatusDisplay === 'Waiting' ? '' : 'disabled'}>Start Consultation</button>
                <button class="action-btn complete-btn" data-appointment-id="${appointment.appointmentId}" 
                    ${queueStatusDisplay === 'In Consultation' ? '' : 'disabled'}>Mark Completed</button>
                <button class="action-btn add-prescription-btn" data-patient-id="${patientIdToUse}">Add Prescription</button>
                <button class="action-btn view-details-btn" data-patient-id="${patientIdToUse}">View Patient Details</button>
            </td>
        `;
        patientTableBody.appendChild(row);
    });

    document.querySelectorAll('.action-btn').forEach(button => {
        button.removeEventListener('click', handleActionButtonClick); 
        button.addEventListener('click', handleActionButtonClick); 
    });
};

// Function to update appointment status in Firebase
const updateAppointmentQueueStatus = async (appointmentId, newStatus) => {
    try {
        const appointmentRef = ref(db, `appointments/${appointmentId}`);
        await update(appointmentRef, { status: newStatus });
        console.log(`Appointment ${appointmentId} status updated to ${newStatus}`);
    } catch (error) {
        console.error("Error updating appointment status:", error);
        alert("Failed to update appointment status. Please try again.");
    }
};

// Handle button clicks for actions
const handleActionButtonClick = (e) => {
    const appointmentId = e.target.dataset.appointmentId;
    const patientId = e.target.dataset.patientId; // This will now correctly be the patient's Firebase Realtime Database Key
    const actionClass = e.target.classList; 

    if (actionClass.contains('start-btn')) {
        updateAppointmentQueueStatus(appointmentId, 'In Consultation'); 
    } else if (actionClass.contains('complete-btn')) {
        updateAppointmentQueueStatus(appointmentId, 'Completed'); 
    } else if (actionClass.contains('add-prescription-btn')) {
        if (patientId) {
            // NAYA LOG
            console.log("QUEUE_DEBUG: Storing patientId for Add Prescription (Firebase Key):", patientId);
            localStorage.setItem('currentPatientIdForPrescription', patientId);
            window.location.href = `add_prescription.html`;
        } else {
            console.error("Patient ID is undefined, cannot store in localStorage for prescription.");
            alert("Error: Patient ID is not available for prescription.");
        }
    } else if (actionClass.contains('view-details-btn')) {
        if (patientId) {
            // NAYA LOG
            console.log("QUEUE_DEBUG: Storing patientId for View Details (Firebase Key):", patientId);
            localStorage.setItem('currentPatientIdForDetails', patientId);
            window.location.href = `patient_details.html`;
        } else {
            console.error("Patient ID is undefined, cannot store in localStorage for details.");
            alert("Error: Patient ID is not available for viewing details.");
        }
    }
};

// Function to filter and search appointments in queue
const filterAndSearchAppointmentsInQueue = () => {
    const searchTerm = searchPatientInput ? searchPatientInput.value.toLowerCase() : '';
    const selectedQueueStatus = filterStatusSelect ? filterStatusSelect.value.toLowerCase() : 'all'; 
    const filterDate = filterDateInput ? filterDateInput.value : ''; // NAYA: Date filter

    let filteredAppointments = allAppointmentsForQueue.filter(appointment => {
        const matchesSearch = (appointment.patientName && appointment.patientName.toLowerCase().includes(searchTerm)) ||
                              (appointment.doctorName && appointment.doctorName.toLowerCase().includes(searchTerm)) ||
                              (appointment.reason && appointment.reason.toLowerCase().includes(searchTerm));
        
        // NAYA: Map appointment status to a queue status for filtering
        let actualQueueStatus;
        if (appointment.status === 'Scheduled' || appointment.status === 'Confirmed' || appointment.status === 'shedules') {
            actualQueueStatus = 'waiting';
        } else if (appointment.status === 'In Consultation') {
            actualQueueStatus = 'in consultation';
        } else if (appointment.status === 'Completed') {
            actualQueueStatus = 'completed';
        } else if (appointment.status === 'Cancelled') {
            actualQueueStatus = 'cancelled';
        } else {
            actualQueueStatus = 'other'; // For any other status
        }

        const matchesStatus = selectedQueueStatus === 'all' || actualQueueStatus === selectedQueueStatus;
        const matchesDate = !filterDate || appointment.date === filterDate; // NAYA: Date matching

        return matchesSearch && matchesStatus && matchesDate; 
    });

    console.log("QUEUE FILTER DEBUG: Final filtered appointments count:", filteredAppointments.length);
    displayAppointmentsInQueue(filteredAppointments);
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
        
        if (['admin', 'doctor', 'receptionist'].includes(currentUserRole)) {
            if (mainContent) mainContent.style.display = 'block';

            const appointmentsRef = ref(db, 'appointments');
            onValue(appointmentsRef, (snapshot) => {
                const data = snapshot.val();
                const appointmentsList = [];
                console.log("QUEUE LISTEN DEBUG: Raw appointments data from Firebase:", data);
                console.log("QUEUE LISTEN DEBUG: Logged-in user UID:", user.uid, "Role:", currentUserRole);

                if (data) {
                    for (let id in data) {
                        const appointment = data[id];
                        console.log(`  Processing Appt: ${id}, Patient: ${appointment.patientName}, DoctorUID_DB: ${appointment.doctorUid}, Appt_Date: ${appointment.date}, Status: ${appointment.status}`);

                        // Only show appointments relevant to the doctor, if the user is a doctor
                        const isForThisDoctor = (currentUserRole === 'doctor' && appointment.doctorUid === user.uid) || (currentUserRole !== 'doctor');
                        
                        console.log(`    - Is For This Doctor: ${isForThisDoctor}`);

                        if (isForThisDoctor) { 
                            appointmentsList.push({ id, ...appointment, appointmentId: id }); 
                        } else {
                            console.log(`    - Skipping appointment ${id} for doctor filter.`);
                        }
                    }
                }
                // Sort appointments by date and then time for a chronological list
                appointmentsList.sort((a, b) => {
                    const dateA = a.date || "9999-12-31"; 
                    const dateB = b.date || "9999-12-31";
                    const timeA = a.time || "00:00";
                    const timeB = b.time || "00:00";

                    if (dateA !== dateB) {
                        return dateA.localeCompare(dateB);
                    }
                    return timeA.localeCompare(timeB);
                });

                allAppointmentsForQueue = appointmentsList; 
                console.log("QUEUE LISTEN DEBUG: allAppointmentsForQueue after initial role filter and sort:", allAppointmentsForQueue);
                filterAndSearchAppointmentsInQueue(); 
            }, (error) => {
                console.error("Error fetching appointments for queue:", error);
                if (patientTableBody) patientTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #ff5722;">Error loading appointments.</td></tr>';
            });

            // Populate filter dropdowns for Queue statuses
            if (filterStatusSelect) {
                filterStatusSelect.innerHTML = `
                    <option value="all">All Queue Statuses</option>
                    <option value="waiting">Waiting</option>
                    <option value="in consultation">In Consultation</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                `;
            }

        } else {
            // User logged in, but doesn't have the correct role
            if (mainContent) mainContent.style.display = 'none';

            let alertMessage = '';
            if (currentUserRole === 'patient') {
                alertMessage = "Access Denied: The Patient Queue is a staff-only feature (Admin, Doctor, Receptionist). As a patient, you can view your own medical history on the 'Prescriptions' or 'Profile' page.";
            } else { 
                alertMessage = "Access Denied: You do not have permission to view patient queue. This module is for Admin, Doctor, and Receptionist roles.";
            }
            alert(alertMessage);
            window.location.href = "index.html"; 
        }

    } else {
        // User logged out
        if (mainContent) mainContent.style.display = 'none';
    }
});

// --- Event Listeners for Search and Filter ---
if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', filterAndSearchAppointmentsInQueue);
}
if (searchPatientInput) {
    searchPatientInput.addEventListener('keyup', filterAndSearchAppointmentsInQueue);
}
if (filterStatusSelect) {
    filterStatusSelect.addEventListener('change', filterAndSearchAppointmentsInQueue);
}
// NAYA: Date filter event listener
if (filterDateInput) {
    filterDateInput.addEventListener('change', filterAndSearchAppointmentsInQueue);
}
