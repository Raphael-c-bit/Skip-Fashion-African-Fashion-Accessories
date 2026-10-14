const API_BASE_URL = "http://127.0.0.1:5000";

const SETTINGS_STORAGE_KEY =
    "heritageAdminSettings";

let adminToken = null;
let adminUser = null;

const defaultSettings = {
    store: {
        storeName:
            "Skip Fashion",
        storeEmail: "",
        storePhone: "",
        storeCountry: "Nigeria",
        storeCurrency: "NGN",
        storeAddress: ""
    },

    orders: {
        allowOrders: true,
        requireAccount: true,
        orderConfirmation: true,
        defaultOrderStatus: "pending"
    },

    customers: {
        allowRegistration: true,
        requireEmailVerification: false,
        allowReviews: true
    },

    notifications: {
        notifyNewOrders: true,
        notifyOrderStatus: true,
        notifyLowStock: true,
        notifyNewCustomers: false
    },

    appearance: {
        dashboardDensity: "comfortable",
        showWelcome: true,
        confirmActions: true
    }
};

document.addEventListener(
    "DOMContentLoaded",
    initializeSettings
);

async function initializeSettings() {
    adminToken =
        localStorage.getItem("heritageAdminAccessToken") ||
        sessionStorage.getItem("heritageAdminAccessToken") ||
        localStorage.getItem("heritageAccessToken") ||
        sessionStorage.getItem("heritageAccessToken");

    if (!adminToken) {
        redirectToLogin();
        return;
    }

    setupSidebar();
    setupSettingsNavigation();
    setupSettingsForms();
    loadLocalSettings();

    try {
        await loadAdminIdentity();
    } catch (error) {
        console.error(
            "Settings initialization error:",
            error
        );

        if (error.message === "AUTH_REQUIRED") {
            redirectToLogin();
            return;
        }

        showSettingsError(
            error.message ||
            "Unable to verify administrator session."
        );
    }
}

async function loadAdminIdentity() {
    const response = await fetch(
        `${API_BASE_URL}/api/admin/auth/me`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${adminToken}`,
                Accept: "application/json"
            }
        }
    );

    if (response.status === 401) {
        throw new Error("AUTH_REQUIRED");
    }

    const data =
        await parseResponse(response);

    if (
        !response.ok ||
        data.success === false
    ) {
        throw new Error(
            data.message ||
            "Unable to load administrator information."
        );
    }

    adminUser =
        data.admin ||
        data.user ||
        data.data ||
        data;

    updateAdminIdentity();
}

function updateAdminIdentity() {
    const name =
        adminUser?.name ||
        adminUser?.full_name ||
        adminUser?.username ||
        "Administrator";

    const email =
        adminUser?.email ||
        "";

    const role =
        adminUser?.role ||
        "Admin";

    const sidebarName =
        document.getElementById(
            "sidebarAdminName"
        );

    const sidebarRole =
        document.getElementById(
            "sidebarAdminRole"
        );

    const topbarName =
        document.getElementById(
            "topbarAdminName"
        );

    const topbarEmail =
        document.getElementById(
            "topbarAdminEmail"
        );

    const sidebarAvatar =
        document.getElementById(
            "sidebarAvatar"
        );

    const topbarAvatar =
        document.getElementById(
            "topbarAvatar"
        );

    if (sidebarName) {
        sidebarName.textContent = name;
    }

    if (sidebarRole) {
        sidebarRole.textContent = role;
    }

    if (topbarName) {
        topbarName.textContent = name;
    }

    if (topbarEmail) {
        topbarEmail.textContent = email;
    }

    const initials =
        getInitials(name);

    if (sidebarAvatar) {
        sidebarAvatar.textContent = initials;
    }

    if (topbarAvatar) {
        topbarAvatar.textContent = initials;
    }
}

function setupSettingsNavigation() {
    const buttons =
        document.querySelectorAll(
            ".settings-nav-item"
        );

    const sections =
        document.querySelectorAll(
            ".settings-section"
        );

    buttons.forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const target =
                    button.dataset.section;

                buttons.forEach(item => {
                    item.classList.toggle(
                        "active",
                        item === button
                    );
                });

                sections.forEach(section => {
                    const isTarget =
                        section.dataset.sectionContent ===
                        target;

                    section.hidden =
                        !isTarget;

                    section.classList.toggle(
                        "active",
                        isTarget
                    );
                });
            }
        );
    });
}

function setupSettingsForms() {
    const storeForm =
        document.getElementById(
            "storeSettingsForm"
        );

    const orderForm =
        document.getElementById(
            "orderSettingsForm"
        );

    const customerForm =
        document.getElementById(
            "customerSettingsForm"
        );

    const notificationForm =
        document.getElementById(
            "notificationSettingsForm"
        );

    const appearanceForm =
        document.getElementById(
            "appearanceSettingsForm"
        );

    storeForm?.addEventListener(
        "submit",
        event => {
            event.preventDefault();

            const settings =
                getStoredSettings();

            settings.store = {
                storeName:
                    getValue("storeName"),
                storeEmail:
                    getValue("storeEmail"),
                storePhone:
                    getValue("storePhone"),
                storeCountry:
                    getValue("storeCountry"),
                storeCurrency:
                    getValue("storeCurrency"),
                storeAddress:
                    getValue("storeAddress")
            };

            saveSettings(settings);

            showSettingsSuccess(
                "Store settings saved successfully."
            );
        }
    );

    orderForm?.addEventListener(
        "submit",
        event => {
            event.preventDefault();

            const settings =
                getStoredSettings();

            settings.orders = {
                allowOrders:
                    getChecked("allowOrders"),

                requireAccount:
                    getChecked("requireAccount"),

                orderConfirmation:
                    getChecked("orderConfirmation"),

                defaultOrderStatus:
                    getValue("defaultOrderStatus")
            };

            saveSettings(settings);

            showSettingsSuccess(
                "Order settings saved successfully."
            );
        }
    );

    customerForm?.addEventListener(
        "submit",
        event => {
            event.preventDefault();

            const settings =
                getStoredSettings();

            settings.customers = {
                allowRegistration:
                    getChecked("allowRegistration"),

                requireEmailVerification:
                    getChecked(
                        "requireEmailVerification"
                    ),

                allowReviews:
                    getChecked("allowReviews")
            };

            saveSettings(settings);

            showSettingsSuccess(
                "Customer settings saved successfully."
            );
        }
    );

    notificationForm?.addEventListener(
        "submit",
        event => {
            event.preventDefault();

            const settings =
                getStoredSettings();

            settings.notifications = {
                notifyNewOrders:
                    getChecked("notifyNewOrders"),

                notifyOrderStatus:
                    getChecked(
                        "notifyOrderStatus"
                    ),

                notifyLowStock:
                    getChecked("notifyLowStock"),

                notifyNewCustomers:
                    getChecked(
                        "notifyNewCustomers"
                    )
            };

            saveSettings(settings);

            showSettingsSuccess(
                "Notification settings saved successfully."
            );
        }
    );

    appearanceForm?.addEventListener(
        "submit",
        event => {
            event.preventDefault();

            const settings =
                getStoredSettings();

            settings.appearance = {
                dashboardDensity:
                    getValue(
                        "dashboardDensity"
                    ),

                showWelcome:
                    getChecked("showWelcome"),

                confirmActions:
                    getChecked("confirmActions")
            };

            saveSettings(settings);

            showSettingsSuccess(
                "Appearance settings saved successfully."
            );
        }
    );

    document
        .getElementById("dismissSuccess")
        ?.addEventListener(
            "click",
            clearSettingsSuccess
        );

    document
        .getElementById("dismissError")
        ?.addEventListener(
            "click",
            clearSettingsError
        );
}

function loadLocalSettings() {
    const settings =
        getStoredSettings();

    setValue(
        "storeName",
        settings.store.storeName
    );

    setValue(
        "storeEmail",
        settings.store.storeEmail
    );

    setValue(
        "storePhone",
        settings.store.storePhone
    );

    setValue(
        "storeCountry",
        settings.store.storeCountry
    );

    setValue(
        "storeCurrency",
        settings.store.storeCurrency
    );

    setValue(
        "storeAddress",
        settings.store.storeAddress
    );

    setChecked(
        "allowOrders",
        settings.orders.allowOrders
    );

    setChecked(
        "requireAccount",
        settings.orders.requireAccount
    );

    setChecked(
        "orderConfirmation",
        settings.orders.orderConfirmation
    );

    setValue(
        "defaultOrderStatus",
        settings.orders.defaultOrderStatus
    );

    setChecked(
        "allowRegistration",
        settings.customers.allowRegistration
    );

    setChecked(
        "requireEmailVerification",
        settings.customers.requireEmailVerification
    );

    setChecked(
        "allowReviews",
        settings.customers.allowReviews
    );

    setChecked(
        "notifyNewOrders",
        settings.notifications.notifyNewOrders
    );

    setChecked(
        "notifyOrderStatus",
        settings.notifications.notifyOrderStatus
    );

    setChecked(
        "notifyLowStock",
        settings.notifications.notifyLowStock
    );

    setChecked(
        "notifyNewCustomers",
        settings.notifications.notifyNewCustomers
    );

    setValue(
        "dashboardDensity",
        settings.appearance.dashboardDensity
    );

    setChecked(
        "showWelcome",
        settings.appearance.showWelcome
    );

    setChecked(
        "confirmActions",
        settings.appearance.confirmActions
    );
}

function getStoredSettings() {
    const stored =
        localStorage.getItem(
            SETTINGS_STORAGE_KEY
        );

    if (!stored) {
        return structuredClone(
            defaultSettings
        );
    }

    try {
        const parsed =
            JSON.parse(stored);

        const settings = mergeSettings(
            structuredClone(defaultSettings),
            parsed
        );

        if (settings.store.storeName === "Heritage Attire & Handmade Crafts") {
            settings.store.storeName = "Skip Fashion";
            saveSettings(settings);
        }

        return settings;
    } catch (error) {
        console.error(
            "Unable to read saved settings:",
            error
        );

        return structuredClone(
            defaultSettings
        );
    }
}

function saveSettings(settings) {
    localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(settings)
    );
}

function mergeSettings(base, saved) {
    Object.keys(base).forEach(section => {
        if (
            saved &&
            saved[section] &&
            typeof saved[section] === "object"
        ) {
            Object.assign(
                base[section],
                saved[section]
            );
        }
    });

    return base;
}

function getValue(id) {
    const element =
        document.getElementById(id);

    return element
        ? element.value
        : "";
}

function setValue(id, value) {
    const element =
        document.getElementById(id);

    if (element) {
        element.value =
            value ?? "";
    }
}

function getChecked(id) {
    const element =
        document.getElementById(id);

    return element
        ? element.checked
        : false;
}

function setChecked(id, value) {
    const element =
        document.getElementById(id);

    if (element) {
        element.checked =
            Boolean(value);
    }
}

function showSettingsSuccess(message) {
    const alert =
        document.getElementById(
            "settingsSuccess"
        );

    const messageElement =
        document.getElementById(
            "settingsSuccessMessage"
        );

    clearSettingsError();

    if (messageElement) {
        messageElement.textContent =
            message;
    }

    if (alert) {
        alert.hidden = false;
    }

    window.setTimeout(
        clearSettingsSuccess,
        4000
    );
}

function clearSettingsSuccess() {
    const alert =
        document.getElementById(
            "settingsSuccess"
        );

    if (alert) {
        alert.hidden = true;
    }
}

function showSettingsError(message) {
    const alert =
        document.getElementById(
            "settingsError"
        );

    const messageElement =
        document.getElementById(
            "settingsErrorMessage"
        );

    if (messageElement) {
        messageElement.textContent =
            message;
    }

    if (alert) {
        alert.hidden = false;
    }
}

function clearSettingsError() {
    const alert =
        document.getElementById(
            "settingsError"
        );

    if (alert) {
        alert.hidden = true;
    }
}

function setupSidebar() {
    const sidebar =
        document.getElementById(
            "adminSidebar"
        );

    const overlay =
        document.getElementById(
            "adminOverlay"
        );

    const toggle =
        document.getElementById(
            "sidebarToggle"
        );

    const close =
        document.getElementById(
            "sidebarClose"
        );

    const logout =
        document.getElementById(
            "logoutButton"
        );

    toggle?.addEventListener(
        "click",
        () => {
            sidebar?.classList.add("open");
            overlay?.classList.add("active");
        }
    );

    close?.addEventListener(
        "click",
        closeSidebar
    );

    overlay?.addEventListener(
        "click",
        closeSidebar
    );

    logout?.addEventListener(
        "click",
        () => {
            clearAdminSession();

            window.location.href =
                "index.html";
        }
    );

    const year =
        document.getElementById(
            "currentYear"
        );

    if (year) {
        year.textContent =
            new Date().getFullYear();
    }
}

function closeSidebar() {
    document
        .getElementById("adminSidebar")
        ?.classList.remove("open");

    document
        .getElementById("adminOverlay")
        ?.classList.remove("active");
}

function clearAdminSession() {
    localStorage.removeItem(
        "heritageAdminAccessToken"
    );

    localStorage.removeItem(
        "heritageAdminRefreshToken"
    );

    localStorage.removeItem(
        "heritageAccessToken"
    );

    localStorage.removeItem(
        "heritageRefreshToken"
    );

    sessionStorage.removeItem(
        "heritageAdminAccessToken"
    );

    sessionStorage.removeItem(
        "heritageAdminRefreshToken"
    );

    sessionStorage.removeItem(
        "heritageAccessToken"
    );

    sessionStorage.removeItem(
        "heritageRefreshToken"
    );
}

function redirectToLogin() {
    clearAdminSession();

    window.location.href =
        "index.html";
}

function getInitials(name) {
    const words =
        String(name || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (!words.length) {
        return "A";
    }

    if (words.length === 1) {
        return words[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return (
        words[0].charAt(0) +
        words[words.length - 1].charAt(0)
    ).toUpperCase();
}

async function parseResponse(response) {
    const text =
        await response.text();

    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        return {
            success: false,
            message:
                "The server returned an invalid response."
        };
    }
}