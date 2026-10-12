const API_BASE_URL = "https://skip-fashion-backend.onrender.com";

let adminToken = null;
let adminUser = null;
let customers = [];
let filteredCustomers = [];

document.addEventListener(
    "DOMContentLoaded",
    initializeCustomers
);

async function initializeCustomers() {
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
    setupCustomerControls();

    try {
        await loadAdminUser();
        await loadCustomers();
    } catch (error) {
        console.error("Customers initialization error:", error);

        if (error.message === "AUTH_REQUIRED") {
            redirectToLogin();
            return;
        }

        showCustomersError(
            error.message ||
            "Unable to load the customers page."
        );
    }
}

async function loadAdminUser() {
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

    const data = await parseResponse(response);

    if (!response.ok || data.success === false) {
        throw new Error(
            data.message ||
            "Unable to verify administrator session."
        );
    }

    adminUser =
        data.admin ||
        data.user ||
        data.data ||
        data;

    updateAdminIdentity();
}

async function loadCustomers() {
    showCustomersLoading();
    clearCustomersError();

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/admin/customers`,
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

        const data = await parseResponse(response);

        if (!response.ok || data.success === false) {
            throw new Error(
                data.message ||
                "Unable to load customers."
            );
        }

        customers = normalizeCustomers(data);

        updateCustomerStats();

        applyCustomerFilters();
    } catch (error) {
        if (error.message === "AUTH_REQUIRED") {
            redirectToLogin();
            return;
        }

        throw error;
    }
}

function normalizeCustomers(data) {
    let customerList =
        data.customers ??
        data.users ??
        data.data ??
        [];

    if (!Array.isArray(customerList)) {
        if (
            customerList &&
            typeof customerList === "object"
        ) {
            customerList =
                customerList.customers ??
                customerList.users ??
                customerList.items ??
                [];
        }
    }

    if (!Array.isArray(customerList)) {
        return [];
    }

    return customerList
        .map(normalizeCustomer)
        .filter(customer => customer !== null);
}

function normalizeCustomer(customer) {
    if (
        !customer ||
        typeof customer !== "object"
    ) {
        return null;
    }

    const id =
        customer.id ??
        customer.user_id ??
        customer.customer_id;

    const name =
        customer.name ||
        customer.full_name ||
        [
            customer.first_name,
            customer.last_name
        ]
            .filter(Boolean)
            .join(" ") ||
        "Unnamed Customer";

    const email =
        customer.email ||
        customer.email_address ||
        "No email";

    const createdAt =
        customer.created_at ??
        customer.createdAt ??
        customer.registered_at ??
        customer.registration_date ??
        customer.date_joined ??
        null;

    const orderCount =
        customer.order_count ??
        customer.orders_count ??
        customer.total_orders ??
        (
            Array.isArray(customer.orders)
                ? customer.orders.length
                : 0
        );

    const role =
        customer.role ||
        "customer";

    const isActive =
        customer.is_active !== undefined
            ? Boolean(customer.is_active)
            : customer.active !== undefined
                ? Boolean(customer.active)
                : true;

    return {
        id,
        name,
        email,
        createdAt,
        orderCount: Number(orderCount) || 0,
        role,
        isActive,
        raw: customer
    };
}

function updateCustomerStats() {
    const totalElement =
        document.getElementById("totalCustomers");

    const activeElement =
        document.getElementById("activeCustomers");

    const newElement =
        document.getElementById("newCustomers");

    const orderingElement =
        document.getElementById("orderingCustomers");

    const total =
        customers.length;

    const active =
        customers.filter(
            customer => customer.isActive
        ).length;

    const ordering =
        customers.filter(
            customer => customer.orderCount > 0
        ).length;

    const currentDate =
        new Date();

    const currentMonth =
        currentDate.getMonth();

    const currentYear =
        currentDate.getFullYear();

    const newThisMonth =
        customers.filter(customer => {
            if (!customer.createdAt) {
                return false;
            }

            const date =
                new Date(customer.createdAt);

            if (Number.isNaN(date.getTime())) {
                return false;
            }

            return (
                date.getMonth() === currentMonth &&
                date.getFullYear() === currentYear
            );
        }).length;

    if (totalElement) {
        totalElement.textContent = total;
    }

    if (activeElement) {
        activeElement.textContent = active;
    }

    if (newElement) {
        newElement.textContent = newThisMonth;
    }

    if (orderingElement) {
        orderingElement.textContent = ordering;
    }
}

function setupCustomerControls() {
    const searchInput =
        document.getElementById("customerSearch");

    const statusFilter =
        document.getElementById(
            "customerStatusFilter"
        );

    const clearSearch =
        document.getElementById(
            "clearCustomerSearch"
        );

    const dismissError =
        document.getElementById(
            "dismissCustomersError"
        );

    if (searchInput) {
        searchInput.addEventListener(
            "input",
            () => {
                if (clearSearch) {
                    clearSearch.hidden =
                        !searchInput.value.trim();
                }

                applyCustomerFilters();
            }
        );
    }

    if (statusFilter) {
        statusFilter.addEventListener(
            "change",
            applyCustomerFilters
        );
    }

    if (clearSearch) {
        clearSearch.addEventListener(
            "click",
            () => {
                if (searchInput) {
                    searchInput.value = "";
                    searchInput.focus();
                }

                clearSearch.hidden = true;

                applyCustomerFilters();
            }
        );
    }

    if (dismissError) {
        dismissError.addEventListener(
            "click",
            clearCustomersError
        );
    }
}

function applyCustomerFilters() {
    const searchInput =
        document.getElementById("customerSearch");

    const statusFilter =
        document.getElementById(
            "customerStatusFilter"
        );

    const searchTerm =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";

    const status =
        statusFilter
            ? statusFilter.value
            : "all";

    filteredCustomers =
        customers.filter(customer => {
            const matchesSearch =
                !searchTerm ||
                customer.name
                    .toLowerCase()
                    .includes(searchTerm) ||
                customer.email
                    .toLowerCase()
                    .includes(searchTerm) ||
                String(customer.id ?? "")
                    .toLowerCase()
                    .includes(searchTerm);

            const matchesStatus =
                status === "all" ||
                (
                    status === "active" &&
                    customer.isActive
                ) ||
                (
                    status === "inactive" &&
                    !customer.isActive
                );

            return (
                matchesSearch &&
                matchesStatus
            );
        });

    renderCustomers();
}

function renderCustomers() {
    const loading =
        document.getElementById(
            "customersLoading"
        );

    const empty =
        document.getElementById(
            "customersEmpty"
        );

    const tableWrapper =
        document.getElementById(
            "customersTableWrapper"
        );

    const mobileList =
        document.getElementById(
            "customersMobileList"
        );

    const resultCount =
        document.getElementById(
            "customerResultCount"
        );

    const emptyMessage =
        document.getElementById(
            "customersEmptyMessage"
        );

    if (loading) {
        loading.hidden = true;
    }

    if (resultCount) {
        resultCount.textContent =
            `${filteredCustomers.length} ${
                filteredCustomers.length === 1
                    ? "customer"
                    : "customers"
            }`;
    }

    if (filteredCustomers.length === 0) {
        if (tableWrapper) {
            tableWrapper.hidden = true;
        }

        if (mobileList) {
            mobileList.hidden = true;
            mobileList.innerHTML = "";
        }

        if (emptyMessage) {
            emptyMessage.textContent =
                customers.length === 0
                    ? "No customers have registered yet."
                    : "There are no customers matching your current search or filter.";
        }

        if (empty) {
            empty.hidden = false;
        }

        return;
    }

    if (empty) {
        empty.hidden = true;
    }

    renderCustomerTable();
    renderCustomerMobileList();

    if (tableWrapper) {
        tableWrapper.hidden = false;
    }

    if (mobileList) {
        mobileList.hidden = false;
    }
}

function renderCustomerTable() {
    const tbody =
        document.getElementById(
            "customersTableBody"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    filteredCustomers.forEach(customer => {
        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>
                <div class="customer-identity">
                    <div class="customer-avatar">
                        ${escapeHtml(
                            getInitials(customer.name)
                        )}
                    </div>

                    <div>
                        <span class="customer-name">
                            ${escapeHtml(customer.name)}
                        </span>

                        <span class="customer-id">
                            #${escapeHtml(
                                customer.id ?? "-"
                            )}
                        </span>
                    </div>
                </div>
            </td>

            <td>
                <span class="customer-email">
                    ${escapeHtml(customer.email)}
                </span>
            </td>

            <td>
                <span class="customer-date">
                    ${escapeHtml(
                        formatDate(customer.createdAt)
                    )}
                </span>
            </td>

            <td>
                <span class="customer-order-count">
                    ${customer.orderCount}
                </span>
            </td>

            <td>
                ${renderStatus(customer)}
            </td>
        `;

        tbody.appendChild(row);
    });
}

function renderCustomerMobileList() {
    const container =
        document.getElementById(
            "customersMobileList"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    filteredCustomers.forEach(customer => {
        const card =
            document.createElement("article");

        card.className =
            "customer-mobile-card";

        card.innerHTML = `
            <div class="customer-mobile-header">

                <div class="customer-identity">

                    <div class="customer-avatar">
                        ${escapeHtml(
                            getInitials(customer.name)
                        )}
                    </div>

                    <div>
                        <span class="customer-name">
                            ${escapeHtml(customer.name)}
                        </span>

                        <span class="customer-id">
                            #${escapeHtml(
                                customer.id ?? "-"
                            )}
                        </span>
                    </div>

                </div>

                ${renderStatus(customer)}

            </div>

            <div class="customer-mobile-details">

                <div class="customer-mobile-row">
                    <span>Email</span>
                    <strong>
                        ${escapeHtml(customer.email)}
                    </strong>
                </div>

                <div class="customer-mobile-row">
                    <span>Registered</span>
                    <strong>
                        ${escapeHtml(
                            formatDate(customer.createdAt)
                        )}
                    </strong>
                </div>

                <div class="customer-mobile-row">
                    <span>Orders</span>
                    <strong>
                        ${customer.orderCount}
                    </strong>
                </div>

            </div>
        `;

        container.appendChild(card);
    });
}

function renderStatus(customer) {
    const statusClass =
        customer.isActive
            ? "customer-status-active"
            : "customer-status-inactive";

    const statusText =
        customer.isActive
            ? "Active"
            : "Inactive";

    return `
        <span
            class="customer-status ${statusClass}"
        >
            ${statusText}
        </span>
    `;
}

function formatDate(value) {
    if (!value) {
        return "-";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString(
        "en-NG",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );
}

function getInitials(name) {
    const words =
        String(name || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (words.length === 0) {
        return "C";
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

    const topbarName =
        document.getElementById(
            "topbarAdminName"
        );

    const topbarEmail =
        document.getElementById(
            "topbarAdminEmail"
        );

    const sidebarName =
        document.getElementById(
            "sidebarAdminName"
        );

    const sidebarRole =
        document.getElementById(
            "sidebarAdminRole"
        );

    const topbarAvatar =
        document.getElementById(
            "topbarAvatar"
        );

    const sidebarAvatar =
        document.getElementById(
            "sidebarAvatar"
        );

    if (topbarName) {
        topbarName.textContent = name;
    }

    if (topbarEmail) {
        topbarEmail.textContent = email;
    }

    if (sidebarName) {
        sidebarName.textContent = name;
    }

    if (sidebarRole) {
        sidebarRole.textContent = role;
    }

    const initials =
        getInitials(name);

    if (topbarAvatar) {
        topbarAvatar.textContent = initials;
    }

    if (sidebarAvatar) {
        sidebarAvatar.textContent = initials;
    }
}

function showCustomersLoading() {
    const loading =
        document.getElementById(
            "customersLoading"
        );

    const empty =
        document.getElementById(
            "customersEmpty"
        );

    const tableWrapper =
        document.getElementById(
            "customersTableWrapper"
        );

    const mobileList =
        document.getElementById(
            "customersMobileList"
        );

    if (loading) {
        loading.hidden = false;
    }

    if (empty) {
        empty.hidden = true;
    }

    if (tableWrapper) {
        tableWrapper.hidden = true;
    }

    if (mobileList) {
        mobileList.hidden = true;
    }
}

function showCustomersError(message) {
    const alert =
        document.getElementById(
            "customersError"
        );

    const messageElement =
        document.getElementById(
            "customersErrorMessage"
        );

    if (messageElement) {
        messageElement.textContent = message;
    }

    if (alert) {
        alert.hidden = false;
    }
}

function clearCustomersError() {
    const alert =
        document.getElementById(
            "customersError"
        );

    if (alert) {
        alert.hidden = true;
    }
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

    if (toggle) {
        toggle.addEventListener(
            "click",
            () => {
                sidebar?.classList.add("open");
                overlay?.classList.add("active");
            }
        );
    }

    if (close) {
        close.addEventListener(
            "click",
            closeSidebar
        );
    }

    if (overlay) {
        overlay.addEventListener(
            "click",
            closeSidebar
        );
    }

    if (logout) {
        logout.addEventListener(
            "click",
            () => {
                clearAdminSession();
                window.location.href =
                    "index.html";
            }
        );
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

function escapeHtml(value) {
    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}