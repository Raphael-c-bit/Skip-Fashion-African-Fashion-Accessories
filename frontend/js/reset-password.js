const API_BASE_URL = "http://127.0.0.1:5000/api";

const form = document.getElementById("resetPasswordForm");
const emailInput = document.getElementById("email");
const resetCodeInput = document.getElementById("resetCode");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const emailError = document.getElementById("emailError");
const codeError = document.getElementById("codeError");
const passwordError = document.getElementById("passwordError");
const confirmPasswordError = document.getElementById("confirmPasswordError");
const formAlert = document.getElementById("formAlert");
const resetButton = document.getElementById("resetButton");
const strengthIndicator = document.getElementById("strengthIndicator");
const strengthText = document.getElementById("strengthText");

const urlParams = new URLSearchParams(window.location.search);
emailInput.value = urlParams.get("email") || "";

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showAlert(message, type = "error") {
    formAlert.textContent = message;
    formAlert.className = `form-alert show ${type}`;
}

function clearAlert() {
    formAlert.textContent = "";
    formAlert.className = "form-alert";
}

function checkPasswordStrength(password) {
    let score = 0;

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    return score;
}

function updatePasswordStrength() {
    const password = passwordInput.value;
    const score = checkPasswordStrength(password);

    const widths = ["0%", "20%", "40%", "60%", "80%", "100%"];
    const messages = [
        "Use at least 8 characters",
        "Very weak",
        "Weak",
        "Fair",
        "Strong",
        "Very strong"
    ];

    strengthIndicator.style.width = widths[score];
    strengthText.textContent = messages[score];

    if (score === 0) {
        strengthIndicator.style.background = "transparent";
    } else if (score <= 2) {
        strengthIndicator.style.background = "#AE445A";
    } else if (score === 3) {
        strengthIndicator.style.background = "#F39F5A";
    } else {
        strengthIndicator.style.background = "#2E7D5B";
    }
}

function setLoading(isLoading) {
    resetButton.disabled = isLoading;
    resetButton.classList.toggle("loading", isLoading);
}

function validateForm() {
    let valid = true;

    emailError.textContent = "";
    codeError.textContent = "";
    passwordError.textContent = "";
    confirmPasswordError.textContent = "";

    emailInput.classList.remove("input-error");
    resetCodeInput.classList.remove("input-error");
    passwordInput.classList.remove("input-error", "input-success");
    confirmPasswordInput.classList.remove("input-error", "input-success");

    if (!validateEmail(emailInput.value.trim())) {
        emailError.textContent = "Enter the email address for your account.";
        emailInput.classList.add("input-error");
        valid = false;
    }

    if (!/^[0-9]{6}$/.test(resetCodeInput.value.trim())) {
        codeError.textContent = "Enter the six-digit code from your email.";
        resetCodeInput.classList.add("input-error");
        valid = false;
    }

    if (!passwordInput.value) {
        passwordError.textContent = "Please enter a new password.";
        passwordInput.classList.add("input-error");
        valid = false;
    } else if (passwordInput.value.length < 8) {
        passwordError.textContent = "Password must contain at least 8 characters.";
        passwordInput.classList.add("input-error");
        valid = false;
    }

    if (!confirmPasswordInput.value) {
        confirmPasswordError.textContent = "Please confirm your new password.";
        confirmPasswordInput.classList.add("input-error");
        valid = false;
    } else if (passwordInput.value !== confirmPasswordInput.value) {
        confirmPasswordError.textContent = "Passwords do not match.";
        confirmPasswordInput.classList.add("input-error");
        valid = false;
    } else {
        confirmPasswordInput.classList.add("input-success");
    }

    return valid;
}

emailInput.addEventListener("input", () => {
    emailError.textContent = "";
    emailInput.classList.remove("input-error");
});

resetCodeInput.addEventListener("input", () => {
    resetCodeInput.value = resetCodeInput.value.replace(/[^0-9]/g, "").slice(0, 6);
    codeError.textContent = "";
    resetCodeInput.classList.remove("input-error");
});

document.querySelectorAll(".password-toggle").forEach(button => {
    button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.target);

        if (target.type === "password") {
            target.type = "text";
            button.textContent = "Hide";
            button.setAttribute("aria-label", "Hide password");
        } else {
            target.type = "password";
            button.textContent = "Show";
            button.setAttribute("aria-label", "Show password");
        }
    });
});

passwordInput.addEventListener("input", () => {
    passwordError.textContent = "";
    passwordInput.classList.remove("input-error");
    updatePasswordStrength();
});

confirmPasswordInput.addEventListener("input", () => {
    confirmPasswordError.textContent = "";
    confirmPasswordInput.classList.remove("input-error");

    if (
        confirmPasswordInput.value &&
        confirmPasswordInput.value === passwordInput.value
    ) {
        confirmPasswordInput.classList.add("input-success");
    } else {
        confirmPasswordInput.classList.remove("input-success");
    }
});

form.addEventListener("submit", async event => {
    event.preventDefault();

    clearAlert();

    if (!validateForm()) {
        showAlert("Please correct the highlighted fields and try again.");
        return;
    }

    setLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: emailInput.value.trim(),
                code: resetCodeInput.value.trim(),
                password: passwordInput.value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to reset your password."
            );
        }

        showAlert(
            "Password reset successful. You can now sign in with your new password. Redirecting to sign in...",
            "success"
        );

        clearCustomerSession();

        form.reset();
        strengthIndicator.style.width = "0%";
        strengthText.textContent = "Use at least 8 characters";

        setTimeout(() => {
            window.location.assign("login.html");
        }, 2200);
    } catch (error) {
        console.error("Reset password error:", error);

        if (error.message.includes("Failed to fetch")) {
            showAlert(
                "The server is currently unavailable. Please make sure the Flask backend is running."
            );
        } else {
            showAlert(error.message);
        }
    } finally {
        setLoading(false);
    }
});

function clearCustomerSession() {
    for (const storage of [localStorage, sessionStorage]) {
        storage.removeItem("heritage_user");
        storage.removeItem("heritage_access_token");
        storage.removeItem("heritage_refresh_token");
    }
}