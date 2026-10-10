const API_BASE_URL = "http://127.0.0.1:5000/api";

const signupForm = document.getElementById("signupForm");
const signupButton = document.getElementById("signupButton");
const formAlert = document.getElementById("formAlert");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const strengthIndicator = document.getElementById("strengthIndicator");
const strengthText = document.getElementById("strengthText");

function showFieldError(field, message) {
    const input = document.getElementById(field);
    const error = document.getElementById(`${field}Error`);

    if (input) {
        input.classList.add("input-error");
        input.classList.remove("input-success");
    }

    if (error) {
        error.textContent = message;
    }
}

function clearFieldError(field) {
    const input = document.getElementById(field);
    const error = document.getElementById(`${field}Error`);

    if (input) {
        input.classList.remove("input-error");
    }

    if (error) {
        error.textContent = "";
    }
}

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

function validatePhone(phone) {
    return phone.replace(/\D/g, "").length >= 10;
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

function validateForm() {
    let isValid = true;

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const terms = document.getElementById("terms").checked;

    ["firstName", "lastName", "email", "phone", "password", "confirmPassword"].forEach(clearFieldError);
    document.getElementById("termsError").textContent = "";

    if (!firstName) {
        showFieldError("firstName", "Please enter your first name.");
        isValid = false;
    }

    if (!lastName) {
        showFieldError("lastName", "Please enter your last name.");
        isValid = false;
    }

    if (!email) {
        showFieldError("email", "Please enter your email address.");
        isValid = false;
    } else if (!validateEmail(email)) {
        showFieldError("email", "Please enter a valid email address.");
        isValid = false;
    }

    if (!phone) {
        showFieldError("phone", "Please enter your phone number.");
        isValid = false;
    } else if (!validatePhone(phone)) {
        showFieldError("phone", "Please enter a valid phone number.");
        isValid = false;
    }

    if (!password) {
        showFieldError("password", "Please create a password.");
        isValid = false;
    } else if (password.length < 8) {
        showFieldError("password", "Password must contain at least 8 characters.");
        isValid = false;
    }

    if (!confirmPassword) {
        showFieldError("confirmPassword", "Please confirm your password.");
        isValid = false;
    } else if (password !== confirmPassword) {
        showFieldError("confirmPassword", "Passwords do not match.");
        isValid = false;
    }

    if (!terms) {
        document.getElementById("termsError").textContent = "You must agree to continue.";
        isValid = false;
    }

    return isValid;
}

function setLoading(isLoading) {
    signupButton.disabled = isLoading;
    signupButton.classList.toggle("loading", isLoading);
}

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

passwordInput.addEventListener("input", updatePasswordStrength);

confirmPasswordInput.addEventListener("input", () => {
    if (confirmPasswordInput.value && confirmPasswordInput.value === passwordInput.value) {
        confirmPasswordInput.classList.remove("input-error");
        confirmPasswordInput.classList.add("input-success");
        document.getElementById("confirmPasswordError").textContent = "";
    }
});

signupForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearAlert();

    if (!validateForm()) {
        showAlert("Please correct the highlighted fields and try again.");
        return;
    }

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = passwordInput.value;

    const userData = {
        name: `${firstName} ${lastName}`,
        email,
        phone,
        password
    };

    setLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to create your account.");
        }

        showAlert("Your account has been created successfully. Redirecting to login...", "success");

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);
    } catch (error) {
        console.error("Signup error:", error);

        if (error.message.includes("Failed to fetch")) {
            showAlert("The server is currently unavailable. Please make sure the Flask backend is running.");
        } else {
            showAlert(error.message);
        }
    } finally {
        setLoading(false);
    }
});