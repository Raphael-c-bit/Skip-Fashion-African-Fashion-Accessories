const API_BASE_URL = "http://127.0.0.1:5000/api";

const form = document.getElementById("forgotPasswordForm");
const emailInput = document.getElementById("email");
const emailError = document.getElementById("emailError");
const formAlert = document.getElementById("formAlert");
const resetButton = document.getElementById("resetButton");

function showAlert(message, type = "error") {
    formAlert.textContent = message;
    formAlert.className = `form-alert show ${type}`;
}

function clearAlert() {
    formAlert.textContent = "";
    formAlert.className = "form-alert";
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setLoading(isLoading) {
    resetButton.disabled = isLoading;
    resetButton.classList.toggle("loading", isLoading);
}

function validateForm() {
    const email = emailInput.value.trim();

    emailError.textContent = "";
    emailInput.classList.remove("input-error");

    if (!email) {
        emailError.textContent = "Please enter your email address.";
        emailInput.classList.add("input-error");
        return false;
    }

    if (!validateEmail(email)) {
        emailError.textContent = "Please enter a valid email address.";
        emailInput.classList.add("input-error");
        return false;
    }

    return true;
}

emailInput.addEventListener("input", () => {
    emailError.textContent = "";
    emailInput.classList.remove("input-error");
    clearAlert();
});

form.addEventListener("submit", async event => {
    event.preventDefault();

    clearAlert();

    if (!validateForm()) {
        return;
    }

    const email = emailInput.value.trim();

    setLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "We could not process your request."
            );
        }

        showAlert(
            "If an account exists with this email, a six-digit reset code has been sent.",
            "success"
        );

        setTimeout(() => {
            window.location.href =
                `reset-password.html?email=${encodeURIComponent(email)}`;
        }, 900);
    } catch (error) {
        console.error("Forgot password error:", error);

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