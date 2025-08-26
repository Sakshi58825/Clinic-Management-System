// js/appointment.js

console.log("------------------- js/appointment.js LOADED -------------------");

import { auth, db } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { protectPage } from "./guard.js";
import { ref, get, set, push, onValue } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// --- Page Protection ---
protectPage('login.html', ['patient', 'receptionist', 'admin']); 

// --- HTML Elements ---
const mainContent = document.getElementById("mainContent");
const infoSection = document.getElementById("infoSection"); // info section (HTML has id="infoSection")
const bookNowBtn = document.getElementById("bookNowBtn"); // "Book Now" button (HTML has id="bookNowBtn")
const bookingFormSection = document.getElementById("bookingFormSection"); // Booking form section (HTML has id="bookingFormSection")

const appointmentForm = document.getElementById("appointmentForm"); // HTML has id="appointmentForm"
const patientNameInput = document.getElementById("patientName"); // HTML has id="patientName"
const doctorSelect = document.getElementById("doctorSelect"); // HTML has id="doctorSelect"
const appointmentDateInput = document.getElementById("appointmentDate"); // HTML has id="appointmentDate"
const appointmentTimeInput = document.getElementById("appointmentTime"); // HTML has id="appointmentTime"
const reasonInput = document.getElementById("reason"); // HTML has id="reason"
const appointmentMessage = document.getElementById("appointmentMessage"); // HTML has id="appointmentMessage"

// Debugging: Check if elements are found
console.log("APP_DEBUG: appointmentForm element found:", !!appointmentForm);
console.log("APP_DEBUG: patientNameInput element found:", !!patientNameInput);
console.log("APP_DEBUG: doctorSelect element found:", !!doctorSelect);


// --- Global Variables ---
let currentUserName = null;
let currentUserRole = null;
let currentUserEmail = null;
let currentUserUid = null;

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

// Function to fetch patient UID by name from Realtime Database
async function getPatientUidByName(patientName) {
    try {
        const patientsRef = ref(db, 'patients');
        const snapshot = await get(patientsRef);
        if (snapshot.exists()) {
            const patientsData = snapshot.val();
            for (let key in patientsData) {
                const patient = patientsData[key];
                // Check for name match AND if a uid exists for that patient record
                if (patient.name === patientName && patient.uid) { 
                    return patient.uid;
                }
            }
        }
    } catch (error) {
        console.error("Error fetching patient UID by name:", error);
    }
    return null;
}

// Function to fetch doctor name by UID from Realtime Database
async function getDoctorNameByUid(doctorUid) {
    try {
        const userProfileRef = ref(db, `users/${doctorUid}`);
        const snapshot = await get(userProfileRef);
        if (snapshot.exists()) {
            return snapshot.val().name; // Return the doctor's name
        }
    } catch (error) {
        console.error("Error fetching doctor name by UID:", error);
    }
    return null;
}

// Function to populate doctors dropdown
const populateDoctorsDropdown = () => {
    const doctorsRef = ref(db, 'users');
    onValue(doctorsRef, (snapshot) => {
        if(doctorSelect) { 
            doctorSelect.innerHTML = '<option value="">Select Doctor</option>'; 
            snapshot.forEach((childSnapshot) => {
                const user = childSnapshot.val();
                if (user.role === 'doctor') {
                    const option = document.createElement('option');
                    option.value = user.uid; 
                    option.textContent = user.name;
                    doctorSelect.appendChild(option);
                }
            });
        } else {
            console.warn("APP_DEBUG: doctorSelect element not found for populating dropdown.");
        }
    }, {
        onlyOnce: true
    });
};

// --- Auth State Change ---
auth.onAuthStateChanged(async (user) => {
    try { 
        if (user) {
            const userProfile = await getUserProfile(user.uid);
            if (!userProfile) {
                await signOut(auth);
                alert("User profile not found. Please log in again.");
                window.location.href = "login.html";
                return;
            }

            currentUserName = userProfile.name;
            currentUserRole = userProfile.role;
            currentUserEmail = user.email; 
            currentUserUid = user.uid; 

            if (mainContent) mainContent.style.display = 'block';

            if (appointmentDateInput) {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                appointmentDateInput.min = `${yyyy}-${mm}-${dd}`;
            }

            populateDoctorsDropdown();

            // If logged in user is a patient, auto-fill their name and disable the input
            if (currentUserRole === 'patient') {
                if (patientNameInput) {
                    patientNameInput.value = currentUserName;
                    patientNameInput.disabled = true;
                }
            } else {
                // For receptionist or admin, patientNameInput should be enabled
                if (patientNameInput) {
                    patientNameInput.disabled = false;
                }
            }

        } else {
            if (mainContent) mainContent.style.display = 'none';
        }
    } catch (error) { 
        console.error("APP_ERROR: Error in auth.onAuthStateChanged block:", error);
        alert("An error occurred during authentication state check. Please check console.");
        if (mainContent) { 
            mainContent.style.display = 'block';
        }
    }
});

// "Book Now" button click listener (to show the form)
if (bookNowBtn && bookingFormSection && infoSection) {
    console.log("APP_DEBUG: Adding click listener to Book Now button.");
    bookNowBtn.addEventListener('click', () => {
        infoSection.style.display = 'none'; // Hide the info section
        bookingFormSection.style.display = 'block'; // Show the booking form section
    });
} else {
    console.warn("APP_WARNING: Book Now button or booking form section not found.");
}


// --- Form Submission ---
if (appointmentForm) { 
    console.log("APP_DEBUG: Adding event listener to appointmentForm."); 
    appointmentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("APP_DEBUG: Form submission event triggered."); 
        appointmentMessage.textContent = "";

        const patientName = patientNameInput.value.trim();
        const doctorUid = doctorSelect.value;
        const appointmentDate = appointmentDateInput.value;
        const appointmentTime = appointmentTimeInput.value;
        const reason = reasonInput.value.trim();

        if (!patientName || !doctorUid || !appointmentDate || !appointmentTime || !reason) {
            appointmentMessage.textContent = "Please fill all required fields.";
            appointmentMessage.style.color = "#ff5722";
            return;
        }

        appointmentMessage.textContent = "Booking appointment...";
        appointmentMessage.style.color = "#ffeb3b";

        try {
            let patientAuthUid;
            // If current user is a patient, use their UID directly
            if (currentUserRole === 'patient') {
                patientAuthUid = currentUserUid;
            } else {
                // For receptionist or admin, fetch patient UID by name
                patientAuthUid = await getPatientUidByName(patientName);
            }
            
            if (!patientAuthUid) {
                appointmentMessage.textContent = "Error: Patient not found or patient UID missing. Please ensure patient is registered correctly with a valid UID.";
                appointmentMessage.style.color = "#ff5722";
                return;
            }

            // Fetch doctor's name using their UID
            const doctorName = await getDoctorNameByUid(doctorUid);
            if (!doctorName) {
                appointmentMessage.textContent = "Error: Doctor name not found for selected doctor. Please try again.";
                appointmentMessage.style.color = "#ff5722";
                return;
            }


            const appointmentData = {
                patientName: patientName,
                patientId: patientAuthUid, // Using patientAuthUid as patientId
                patientUid: patientAuthUid, // Storing patient UID explicitly for easier lookup later
                doctorUid: doctorUid,
                doctorName: doctorName, // Store doctor's name
                appointmentDate: appointmentDate, 
                time: appointmentTime, 
                reason: reason, 
                status: "Scheduled", 
                timestamp: new Date().toISOString()
            };

            const newAppointmentRef = push(ref(db, 'appointments'));
            await set(newAppointmentRef, appointmentData);

            appointmentMessage.textContent = "✅ Appointment booked successfully!";
            appointmentMessage.style.color = "#4CAF50";

            // Clear form fields
            if (currentUserRole !== 'patient') patientNameInput.value = ''; 
            if(doctorSelect) doctorSelect.value = ''; 
            if(appointmentDateInput) appointmentDateInput.value = ''; 
            if(appointmentTimeInput) appointmentTimeInput.value = ''; 
            if(reasonInput) reasonInput.value = ''; 

        } catch (error) {
            console.error("APP_ERROR: Error booking appointment:", error); 
            appointmentMessage.textContent = `❌ Error: ${error.message}`;
            appointmentMessage.style.color = "#ff5722";
        }
    });
} else {
    console.warn("APP_WARNING: appointmentForm element not found. Event listener not attached."); 
}
