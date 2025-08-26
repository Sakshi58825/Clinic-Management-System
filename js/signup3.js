// js/signup3.js

import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

const form    = document.getElementById("signupForm");
const msgBox  = document.getElementById("message");

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const roleSelect = document.getElementById("role");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msgBox.textContent = "Creating your account...";
  msgBox.style.color = "#ffeb3b";

  const name     = nameInput.value.trim();
  const email    = emailInput.value.trim();
  const password = passwordInput.value;
  const role     = roleSelect.value;

  if (!name || !email || !password || !role) {
    msgBox.textContent = "❌ Please fill in all fields (Full Name, Email, Password, Role).";
    msgBox.style.color = "#ff5722";
    return;
  }
  if (password.length < 6) {
    msgBox.textContent = "❌ Password should be at least 6 characters.";
    msgBox.style.color = "#ff5722";
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    await set(ref(db, `users/${user.uid}`), {
      name: name,
      email: email,
      role: role,
      createdAt: new Date().toISOString()
    });

    msgBox.textContent = `✅ Signup successful! Welcome, ${name}. Redirecting to login...`;
    msgBox.style.color = "#4CAF50";
    form.reset();

    setTimeout(() => {
      window.location.href = "login.html"; // Redirect to the main login page
    }, 1500);


  } catch (err) {
    console.error("Signup Error:", err);
    let errorMessage = "❌ Signup failed. Please try again.";

    if (err.code === 'auth/email-already-in-use') {
      errorMessage = "❌ This email is already registered. Try logging in or use a different email.";
    } else if (err.code === 'auth/weak-password') {
        errorMessage = "❌ Password is too weak. Please use a stronger password.";
    } else if (err.code === 'auth/invalid-email') {
        errorMessage = "❌ Invalid email format.";
    }

    msgBox.textContent = errorMessage;
    msgBox.style.color = "#ff5722";
  }
});
