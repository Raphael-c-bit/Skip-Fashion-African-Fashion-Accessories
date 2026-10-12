const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");
const loginButton = document.getElementById("loginButton");
const formMessage = document.getElementById("formMessage");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const rememberMe = document.getElementById("rememberMe");
const currentYear = document.getElementById("currentYear");
const forgotPassword = document.getElementById("forgotPassword");
const forgotModal = document.getElementById("forgotModal");
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const forgotForm = document.getElementById("forgotForm");
const resetEmail = document.getElementById("resetEmail");
const modalMessage = document.getElementById("modalMessage");
const API_BASE_URL = "https://skip-fashion-backend.onrender.com";
let passwordResetRequested = false;

currentYear.textContent = new Date().getFullYear();

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(input, errorElement, message) {
    input.closest(".input-wrapper").classList.add("has-error");
    errorElement.textContent = message;
}

function clearFieldError(input, errorElement) {
    input.closest(".input-wrapper").classList.remove("has-error");
    errorElement.textContent = "";
}

function showFormMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message show ${type}`;
}

function clearFormMessage() {
    formMessage.textContent = "";
    formMessage.className = "form-message";
}

emailInput.addEventListener("input", () => {
    clearFieldError(emailInput, emailError);
    clearFormMessage();
});

passwordInput.addEventListener("input", () => {
    clearFieldError(passwordInput, passwordError);
    clearFormMessage();
});

passwordToggle.addEventListener("click", () => {
    const showingPassword = passwordInput.type === "text";

    passwordInput.type = showingPassword ? "password" : "text";

    passwordToggle.setAttribute(
        "aria-label",
        showingPassword ? "Show password" : "Hide password"
    );

    passwordToggle.querySelector(".eye-open").style.display = showingPassword
        ? "block"
        : "none";

    passwordToggle.querySelector(".eye-closed").style.display = showingPassword
        ? "none"
        : "block";
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearFieldError(emailInput, emailError);
    clearFieldError(passwordInput, passwordError);
    clearFormMessage();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let valid = true;

    if (!email) {
        showFieldError(
            emailInput,
            emailError,
            "Please enter your email address."
        );

        valid = false;
    } else if (!validateEmail(email)) {
        showFieldError(
            emailInput,
            emailError,
            "Please enter a valid email address."
        );

        valid = false;
    }

    if (!password) {
        showFieldError(
            passwordInput,
            passwordError,
            "Please enter your password."
        );

        valid = false;
    }

    if (!valid) {
        return;
    }

    loginButton.disabled = true;
    loginButton.classList.add("loading");

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Invalid email or password."
            );
        }

        const user = data.user;

        if (user.role === "admin") {
            const adminStorage = rememberMe.checked
                ? localStorage
                : sessionStorage;
            const otherStorage = rememberMe.checked
                ? sessionStorage
                : localStorage;

            adminStorage.setItem("heritageAdmin", JSON.stringify(user));
            adminStorage.setItem("heritageAccessToken", data.access_token);

            if (data.refresh_token) {
                adminStorage.setItem("heritageRefreshToken", data.refresh_token);
            }

            otherStorage.removeItem("heritageAdmin");
            otherStorage.removeItem("heritageAccessToken");
            otherStorage.removeItem("heritageRefreshToken");

            [localStorage, sessionStorage].forEach(storage => {
                storage.removeItem("heritage_user");
                storage.removeItem("heritage_access_token");
                storage.removeItem("heritage_refresh_token");
            });

            showFormMessage(
                "Admin login successful. Redirecting to dashboard...",
                "success"
            );

            setTimeout(() => {
                window.location.href = "../admin/dashboard.html";
            }, 700);

            return;
        }

        const userData = JSON.stringify(user);

        if (rememberMe.checked) {
            localStorage.setItem(
                "heritage_user",
                userData
            );

            localStorage.setItem(
                "heritage_access_token",
                data.access_token
            );

            localStorage.setItem(
                "heritage_refresh_token",
                data.refresh_token
            );

            sessionStorage.removeItem("heritage_user");
        } else {
            sessionStorage.setItem(
                "heritage_user",
                userData
            );

            sessionStorage.setItem(
                "heritage_access_token",
                data.access_token
            );

            sessionStorage.setItem(
                "heritage_refresh_token",
                data.refresh_token
            );

            localStorage.removeItem("heritage_user");
            localStorage.removeItem("heritage_access_token");
            localStorage.removeItem("heritage_refresh_token");
        }

        showFormMessage(
            "Login successful. Welcome back to Skip Fashion.",
            "success"
        );

        const redirect =
            sessionStorage.getItem("heritageRedirect") ||
            localStorage.getItem("heritageRedirect") ||
            "../account/index.html";

        sessionStorage.removeItem("heritageRedirect");
        localStorage.removeItem("heritageRedirect");

        setTimeout(() => {
            window.location.href = redirect;
        }, 700);

    } catch (error) {
        showFormMessage(
            error.message || "Unable to sign in right now. Please try again.",
            "error"
        );

        loginButton.disabled = false;
        loginButton.classList.remove("loading");
    }
});

forgotPassword.addEventListener("click", (event) => {
    event.preventDefault();
    passwordResetRequested = true;

    resetEmail.value = emailInput.value.trim();

    modalMessage.textContent = "";
    modalMessage.className = "modal-message";

    forgotModal.classList.add("active");
    forgotModal.setAttribute("aria-hidden", "false");
    resetEmail.focus();
});

function closeForgotModal() {
    forgotPassword.focus();
    forgotModal.classList.remove("active");
    forgotModal.setAttribute("aria-hidden", "true");
}

modalClose.addEventListener("click", closeForgotModal);

modalOverlay.addEventListener("click", closeForgotModal);

document.addEventListener("keydown", (event) => {
    if (
        event.key === "Escape" &&
        forgotModal.classList.contains("active")
    ) {
        closeForgotModal();
    }
});

forgotForm.addEventListener("submit", async event => {
    event.preventDefault();

    const email = resetEmail.value.trim();

    if (!email || !validateEmail(email)) {
        modalMessage.textContent =
            "Please enter a valid email address.";

        modalMessage.style.color = "var(--error)";
        modalMessage.className = "modal-message show";

        return;
    }

    const submitButton = forgotForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Sending...";

    try {
        const response = await fetch(
            `${API_BASE_URL}/auth/forgot-password`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to send a reset code right now."
            );
        }

        modalMessage.textContent =
            "If an account exists with this email, a six-digit reset code has been sent.";
        modalMessage.style.color = "var(--success)";
        modalMessage.className = "modal-message show";

        setTimeout(() => {
            window.location.href =
                `reset-password.html?email=${encodeURIComponent(email)}`;
        }, 900);
    } catch (error) {
        modalMessage.textContent = error.message.includes("Failed to fetch")
            ? "The server is unavailable. Please try again shortly."
            : error.message;
        modalMessage.style.color = "var(--error)";
        modalMessage.className = "modal-message show";
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Send 6-Digit Code";
    }
});

async function redirectSignedInCustomer() {
    const accessToken =
    localStorage.getItem("heritage_access_token") ||
    sessionStorage.getItem("heritage_access_token");

    if (!accessToken) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            clearStoredCustomerSession();
            return;
        }

        if (data.user?.role === "customer" && !passwordResetRequested) {
            showFormMessage(
                "You are already signed in. Redirecting...",
                "success"
            );

            setTimeout(() => {
                if (!passwordResetRequested) {
                    window.location.href = "../account/index.html";
                }
            }, 700);
        }
    } catch (error) {
        console.error("Existing customer session check failed:", error);
    }
}

function clearStoredCustomerSession() {
    for (const storage of [localStorage, sessionStorage]) {
        storage.removeItem("heritage_user");
        storage.removeItem("heritage_access_token");
        storage.removeItem("heritage_refresh_token");
    }
}

redirectSignedInCustomer();