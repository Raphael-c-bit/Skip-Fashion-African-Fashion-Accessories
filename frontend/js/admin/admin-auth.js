const API_BASE_URL = "http://127.0.0.1:5000/api";

const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const passwordToggle = document.getElementById("passwordToggle");
const loginButton = document.getElementById("loginButton");
const formMessage = document.getElementById("formMessage");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const rememberAdmin = document.getElementById("rememberAdmin");
const currentYear = document.getElementById("currentYear");

const forgotPassword = document.getElementById("forgotPassword");
const forgotModal = document.getElementById("forgotModal");
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const forgotForm = document.getElementById("forgotForm");
const resetEmail = document.getElementById("resetEmail");
const modalMessage = document.getElementById("modalMessage");


/* =========================================
   PAGE SETUP
========================================= */

if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}


/* =========================================
   VALIDATION HELPERS
========================================= */

function showFieldError(input, errorElement, message) {
    const wrapper = input.closest(".input-wrapper");

    if (wrapper) {
        wrapper.classList.add("has-error");
    }

    errorElement.textContent = message;
}

function clearFieldError(input, errorElement) {
    const wrapper = input.closest(".input-wrapper");

    if (wrapper) {
        wrapper.classList.remove("has-error");
    }

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

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


/* =========================================
   ADMIN SESSION STORAGE
========================================= */

function getStoredAdmin() {
    const localAdmin =
        localStorage.getItem("heritageAdmin");

    const sessionAdmin =
        sessionStorage.getItem("heritageAdmin");

    return localAdmin || sessionAdmin;
}

function getStoredAccessToken() {
    return (
        localStorage.getItem("heritageAdminAccessToken") ||
        sessionStorage.getItem("heritageAdminAccessToken")
    );
}

function getStoredRefreshToken() {
    return (
        localStorage.getItem("heritageAdminRefreshToken") ||
        sessionStorage.getItem("heritageAdminRefreshToken")
    );
}

function clearAdminSession() {
    localStorage.removeItem("heritageAdmin");
    sessionStorage.removeItem("heritageAdmin");

    localStorage.removeItem("heritageAdminAccessToken");
    sessionStorage.removeItem("heritageAdminAccessToken");

    localStorage.removeItem("heritageAdminRefreshToken");
    sessionStorage.removeItem("heritageAdminRefreshToken");
}

function saveAdminSession(data, remember) {
    const storage = remember
        ? localStorage
        : sessionStorage;

    const adminUser = data.admin;

    storage.setItem(
        "heritageAdmin",
        JSON.stringify(adminUser)
    );

    storage.setItem(
        "heritageAdminAccessToken",
        data.access_token
    );

    if (data.refresh_token) {
        storage.setItem(
            "heritageAdminRefreshToken",
            data.refresh_token
        );
    }
}


/* =========================================
   LOGIN LOADING STATE
========================================= */

function setLoginLoading(isLoading) {
    loginButton.disabled = isLoading;

    loginButton.classList.toggle(
        "loading",
        isLoading
    );

    if (isLoading) {
        loginButton.textContent = "Signing In...";
    } else {
        loginButton.textContent = "Sign In";
    }
}


/* =========================================
   INPUT EVENTS
========================================= */

adminEmail.addEventListener("input", () => {
    clearFieldError(
        adminEmail,
        emailError
    );

    clearFormMessage();
});

adminPassword.addEventListener("input", () => {
    clearFieldError(
        adminPassword,
        passwordError
    );

    clearFormMessage();
});


/* =========================================
   PASSWORD VISIBILITY
========================================= */

passwordToggle.addEventListener("click", () => {
    const isPassword =
        adminPassword.type === "password";

    adminPassword.type = isPassword
        ? "text"
        : "password";

    passwordToggle.setAttribute(
        "aria-label",
        isPassword
            ? "Hide password"
            : "Show password"
    );

    const eyeOpen =
        passwordToggle.querySelector(".eye-open");

    const eyeClosed =
        passwordToggle.querySelector(".eye-closed");

    if (eyeOpen) {
        eyeOpen.style.display = isPassword
            ? "none"
            : "block";
    }

    if (eyeClosed) {
        eyeClosed.style.display = isPassword
            ? "block"
            : "none";
    }
});


/* =========================================
   ADMIN LOGIN
========================================= */

adminLoginForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        clearFieldError(
            adminEmail,
            emailError
        );

        clearFieldError(
            adminPassword,
            passwordError
        );

        clearFormMessage();

        const email =
            adminEmail.value
                .trim()
                .toLowerCase();

        const password =
            adminPassword.value;

        let valid = true;

        if (!email) {
            showFieldError(
                adminEmail,
                emailError,
                "Please enter your admin email."
            );

            valid = false;
        } else if (!validateEmail(email)) {
            showFieldError(
                adminEmail,
                emailError,
                "Please enter a valid email address."
            );

            valid = false;
        }

        if (!password) {
            showFieldError(
                adminPassword,
                passwordError,
                "Please enter your password."
            );

            valid = false;
        }

        if (!valid) {
            return;
        }

        setLoginLoading(true);

        try {
            const response = await fetch(
                `${API_BASE_URL}/admin/auth/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ||
                    "Unable to sign in."
                );
            }

            /*
             * The admin API returns:
             *
             * data.admin
             * data.access_token
             * data.refresh_token
             */

            if (
                !data.admin ||
                data.admin.role !== "admin"
            ) {
                clearAdminSession();

                showFormMessage(
                    "This account does not have administrator access.",
                    "error"
                );

                setLoginLoading(false);

                return;
            }

            if (!data.access_token) {
                throw new Error(
                    "Login succeeded but no administrator access token was returned."
                );
            }

            saveAdminSession(
                data,
                rememberAdmin.checked
            );

            showFormMessage(
                "Administrator login successful. Redirecting...",
                "success"
            );

            setTimeout(() => {
                window.location.href =
                    "dashboard.html";
            }, 700);

        } catch (error) {
            console.error(
                "Admin login error:",
                error
            );

            let message =
                error.message;

            if (
                error instanceof TypeError &&
                error.message.includes("fetch")
            ) {
                message =
                    "Unable to connect to the Skip Fashion server. Make sure the Flask backend is running.";
            }

            showFormMessage(
                message ||
                "Unable to sign in. Please try again.",
                "error"
            );

            setLoginLoading(false);
        }
    }
);


/* =========================================
   FORGOT PASSWORD MODAL
========================================= */

function openForgotModal() {
    resetEmail.value =
        adminEmail.value.trim();

    modalMessage.textContent = "";

    modalMessage.className =
        "modal-message";

    forgotModal.classList.add("active");

    forgotModal.setAttribute(
        "aria-hidden",
        "false"
    );

    setTimeout(() => {
        resetEmail.focus();
    }, 250);
}

function closeForgotModal() {
    forgotModal.classList.remove(
        "active"
    );

    forgotModal.setAttribute(
        "aria-hidden",
        "true"
    );
}

forgotPassword.addEventListener(
    "click",
    (event) => {
        event.preventDefault();

        openForgotModal();
    }
);

modalClose.addEventListener(
    "click",
    closeForgotModal
);

modalOverlay.addEventListener(
    "click",
    closeForgotModal
);

document.addEventListener(
    "keydown",
    (event) => {
        if (
            event.key === "Escape" &&
            forgotModal.classList.contains(
                "active"
            )
        ) {
            closeForgotModal();
        }
    }
);

forgotForm.addEventListener(
    "submit",
    (event) => {
        event.preventDefault();

        const email =
            resetEmail.value.trim();

        if (
            !email ||
            !validateEmail(email)
        ) {
            modalMessage.textContent =
                "Please enter a valid administrator email.";

            modalMessage.className =
                "modal-message show error";

            return;
        }

        modalMessage.textContent =
            "Password recovery is not connected yet. We will implement the administrator password recovery flow after the core admin system is completed.";

        modalMessage.className =
            "modal-message show info";
    }
);


/* =========================================
   CHECK EXISTING ADMIN SESSION
========================================= */

async function checkExistingAdminSession() {
    const storedAdmin =
        getStoredAdmin();

    if (!storedAdmin) {
        return;
    }

    try {
        const admin =
            JSON.parse(storedAdmin);

        if (
            !admin ||
            admin.role !== "admin"
        ) {
            clearAdminSession();

            return;
        }

        const accessToken =
            getStoredAccessToken();

        if (!accessToken) {
            clearAdminSession();

            return;
        }

        const response = await fetch(
            `${API_BASE_URL}/admin/auth/me`,
            {
                method: "GET",

                headers: {
                    Authorization:
                        `Bearer ${accessToken}`
                }
            }
        );

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (
            response.ok &&
            data.success &&
            data.admin &&
            data.admin.role === "admin"
        ) {
            /*
             * Keep the stored admin information
             * synchronized with the database.
             */

            const storage =
                localStorage.getItem("heritageAdmin")
                    ? localStorage
                    : sessionStorage;

            storage.setItem(
                "heritageAdmin",
                JSON.stringify(data.admin)
            );

            showFormMessage(
                "You are already signed in. Redirecting...",
                "success"
            );

            setTimeout(() => {
                window.location.href =
                    "dashboard.html";
            }, 700);

            return;
        }

        clearAdminSession();

    } catch (error) {
        console.error(
            "Existing admin session check failed:",
            error
        );

        clearAdminSession();
    }
}

checkExistingAdminSession();