const API_BASE_URL = "https://skip-fashion-backend.onrender.com";

const ADMIN_ACCESS_TOKEN_KEY = "heritageAdminAccessToken";
const ADMIN_REFRESH_TOKEN_KEY = "heritageAdminRefreshToken";
const ADMIN_USER_KEY = "heritageAdmin";

let adminToken = null;
let adminUser = null;

document.addEventListener("DOMContentLoaded", initializeDashboard);

async function initializeDashboard() {
    adminToken = getAdminAccessToken();

    if (!adminToken) {
        redirectToLogin();
        return;
    }

    initializeSidebar();
    initializeLogout();
    initializeRefresh();
    initializeErrorDismiss();
    setCurrentYear();

    try {
        adminUser = await loadCurrentAdmin();

        renderAdminIdentity(adminUser);

        await loadDashboardData();
    } catch (error) {
        console.error("Dashboard initialization error:", error);

        if (
            error.status === 401 ||
            error.status === 403
        ) {
            clearAdminSession();
            redirectToLogin();
            return;
        }

        showDashboardError(
            error.message ||
            "Unable to load the admin dashboard."
        );
    }
}

function getAdminAccessToken() {
    return (
        localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY) ||
        sessionStorage.getItem(ADMIN_ACCESS_TOKEN_KEY)
    );
}

function getAdminRefreshToken() {
    return (
        localStorage.getItem(ADMIN_REFRESH_TOKEN_KEY) ||
        sessionStorage.getItem(ADMIN_REFRESH_TOKEN_KEY)
    );
}

async function apiRequest(endpoint, options = {}) {
    const headers = {
        Accept: "application/json",
        ...(options.headers || {})
    };

    if (
        options.body &&
        !headers["Content-Type"]
    ) {
        headers["Content-Type"] = "application/json";
    }

    if (adminToken) {
        headers.Authorization = `Bearer ${adminToken}`;
    }

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,
            headers
        }
    );

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const error = new Error(
            data?.message ||
            data?.error ||
            `Request failed with status ${response.status}`
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
}

async function loadCurrentAdmin() {
    const response = await apiRequest(
        "/api/admin/auth/me"
    );

    const admin =
        response?.admin ||
        response?.data?.admin ||
        null;

    if (!admin) {
        throw new Error(
            "Unable to retrieve administrator information."
        );
    }

    if (admin.role !== "admin") {
        const error = new Error(
            "This account does not have administrator access."
        );

        error.status = 403;

        throw error;
    }

    if (admin.is_active === false) {
        const error = new Error(
            "This administrator account is inactive."
        );

        error.status = 403;

        throw error;
    }

    return admin;
}

async function loadDashboardData() {
    setDashboardLoadingState(true);

    hideDashboardError();

    try {
        const results = await Promise.allSettled([
            apiRequest("/api/admin/orders"),
            apiRequest("/api/admin/customers"),
            apiRequest("/api/products/admin"),
            apiRequest("/api/categories")
        ]);

        const [
            ordersResult,
            customersResult,
            productsResult,
            categoriesResult
        ] = results;

        const authenticationFailure =
            results.find(
                (result) =>
                    result.status === "rejected" &&
                    (
                        result.reason?.status === 401 ||
                        result.reason?.status === 403
                    )
            );

        if (authenticationFailure) {
            throw authenticationFailure.reason;
        }

        const orders =
            ordersResult.status === "fulfilled"
                ? getArrayFromResponse(
                    ordersResult.value,
                    ["orders"]
                )
                : [];

        const customers =
            customersResult.status === "fulfilled"
                ? getArrayFromResponse(
                    customersResult.value,
                    ["customers"]
                )
                : [];

        const products =
            productsResult.status === "fulfilled"
                ? getArrayFromResponse(
                    productsResult.value,
                    ["products"]
                )
                : [];

        const categories =
            categoriesResult.status === "fulfilled"
                ? getArrayFromResponse(
                    categoriesResult.value,
                    ["categories"]
                )
                : [];

        console.log("Dashboard orders:", orders);
        console.log("Dashboard customers:", customers);
        console.log("Dashboard products:", products);
        console.log("Dashboard categories:", categories);

        renderOrderStatistics(orders);
        renderCustomerStatistics(customers);
        renderProductStatistics(products);
        renderCategoryStatistics(categories);
        renderRecentOrders(orders);

        const failedNames = [];

        if (
            ordersResult.status === "rejected"
        ) {
            failedNames.push("orders");
        }

        if (
            customersResult.status === "rejected"
        ) {
            failedNames.push("customers");
        }

        if (
            productsResult.status === "rejected"
        ) {
            failedNames.push("products");
        }

        if (
            categoriesResult.status === "rejected"
        ) {
            failedNames.push("categories");
        }

        if (failedNames.length > 0) {
            showDashboardError(
                `Some dashboard data could not be loaded: ${failedNames.join(", ")}.`
            );
        } else {
            hideDashboardError();
        }
    } finally {
        setDashboardLoadingState(false);
    }
}

function getArrayFromResponse(
    response,
    possibleKeys = []
) {
    if (Array.isArray(response)) {
        return response;
    }

    if (
        !response ||
        typeof response !== "object"
    ) {
        return [];
    }

    for (const key of possibleKeys) {
        if (Array.isArray(response[key])) {
            return response[key];
        }
    }

    if (Array.isArray(response.data)) {
        return response.data;
    }

    if (
        response.data &&
        typeof response.data === "object"
    ) {
        for (const key of possibleKeys) {
            if (
                Array.isArray(
                    response.data[key]
                )
            ) {
                return response.data[key];
            }
        }
    }

    return [];
}

function renderOrderStatistics(orders) {
    const totalOrdersElement =
        document.getElementById("totalOrders");

    const pendingOrdersElement =
        document.getElementById("pendingOrders");

    const pending =
        countOrdersByStatus(
            orders,
            "pending"
        );

    const processing =
        countOrdersByStatus(
            orders,
            "processing"
        );

    const shipped =
        countOrdersByStatus(
            orders,
            "shipped"
        );

    const delivered =
        countOrdersByStatus(
            orders,
            "delivered"
        );

    if (totalOrdersElement) {
        totalOrdersElement.textContent =
            orders.length;
    }

    if (pendingOrdersElement) {
        pendingOrdersElement.textContent =
            pending;
    }

    setElementText(
        "pendingOrderCount",
        pending
    );

    setElementText(
        "statusPending",
        pending
    );

    setElementText(
        "statusProcessing",
        processing
    );

    setElementText(
        "statusShipped",
        shipped
    );

    setElementText(
        "statusDelivered",
        delivered
    );
}

function renderCustomerStatistics(customers) {
    setElementText(
        "totalCustomers",
        customers.length
    );
}

function renderProductStatistics(products) {
    const activeProducts =
        products.filter(
            (product) =>
                product.is_active !== false &&
                product.is_active !== 0 &&
                product.is_active !== "0"
        );

    const featuredProducts =
        products.filter(
            (product) =>
                product.is_featured === true ||
                product.is_featured === 1 ||
                product.is_featured === "1"
        );

    setElementText(
        "totalProducts",
        activeProducts.length
    );

    setElementText(
        "activeProducts",
        activeProducts.length
    );

    setElementText(
        "featuredProducts",
        featuredProducts.length
    );
}

function renderCategoryStatistics(categories) {
    setElementText(
        "totalCategories",
        categories.length
    );
}

function renderRecentOrders(orders) {
    const tableBody =
        document.getElementById(
            "recentOrdersTable"
        );

    if (!tableBody) {
        console.error(
            "Could not find #recentOrdersTable."
        );
        return;
    }

    const recentOrders =
        [...orders]
            .sort((a, b) => {
                const dateA =
                    new Date(
                        a.created_at || 0
                    ).getTime();

                const dateB =
                    new Date(
                        b.created_at || 0
                    ).getTime();

                return dateB - dateA;
            })
            .slice(0, 7);

    if (
        recentOrders.length === 0
    ) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="table-state">
                        No orders found.
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML =
        recentOrders
            .map(
                (order) =>
                    createOrderRow(order)
            )
            .join("");
}

function createOrderRow(order) {
    const orderId =
        order.id;

    const orderNumber =
        order.order_number ||
        `HAHC-${String(orderId).padStart(6, "0")}`;

    const customerName =
        order.shipping_name ||
        "Customer";

    const amount =
        order.total_amount ?? 0;

    const currency =
        order.currency || "NGN";

    const status =
        order.status || "pending";

    const formattedDate =
        formatDate(
            order.created_at
        );

    const formattedAmount =
        formatCurrency(
            amount,
            currency
        );

    const statusClass =
        getStatusClass(status);

    return `
        <tr>
            <td>
                <a
                    href="order-details.html?id=${encodeURIComponent(orderId)}"
                    class="order-link"
                >
                    #${escapeHtml(orderNumber)}
                </a>
            </td>

            <td>
                ${escapeHtml(customerName)}
            </td>

            <td>
                ${formattedAmount}
            </td>

            <td>
                <span class="order-status ${statusClass}">
                    ${escapeHtml(
                        formatStatus(status)
                    )}
                </span>
            </td>

            <td>
                ${formattedDate}
            </td>

            <td>
                <a
                    href="order-details.html?id=${encodeURIComponent(orderId)}"
                    class="view-order-link"
                >
                    View
                </a>
            </td>
        </tr>
    `;
}

function countOrdersByStatus(
    orders,
    status
) {
    return orders.filter(
        (order) =>
            String(
                order.status || ""
            )
                .toLowerCase()
                .trim() ===
            status
                .toLowerCase()
                .trim()
    ).length;
}

function formatStatus(status) {
    if (!status) {
        return "Pending";
    }

    return String(status)
        .replace(/[\_-]/g, " ")
        .replace(
            /\b\w/g,
            (character) =>
                character.toUpperCase()
        );
}

function getStatusClass(status) {
    const normalizedStatus =
        String(status || "")
            .toLowerCase()
            .trim();

    switch (normalizedStatus) {
        case "pending":
            return "status-pending";

        case "processing":
            return "status-processing";

        case "confirmed":
            return "status-confirmed";

        case "shipped":
            return "status-shipped";

        case "delivered":
            return "status-delivered";

        case "cancelled":
        case "canceled":
            return "status-cancelled";

        default:
            return "status-default";
    }
}

function formatCurrency(
    amount,
    currency = "NGN"
) {
    const numericAmount =
        Number(amount);

    if (
        !Number.isFinite(
            numericAmount
        )
    ) {
        return "₦0.00";
    }

    try {
        return new Intl.NumberFormat(
            "en-NG",
            {
                style: "currency",
                currency:
                    currency || "NGN",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(
            numericAmount
        );
    } catch {
        return `₦${numericAmount.toLocaleString(
            "en-NG",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )}`;
    }
}

function formatDate(dateValue) {
    if (!dateValue) {
        return "—";
    }

    const date =
        new Date(dateValue);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
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

function renderAdminIdentity(admin) {
    const name =
        admin?.name ||
        admin?.full_name ||
        "Administrator";

    const email =
        admin?.email ||
        "Admin account";

    setElementText(
        "sidebarAdminName",
        name
    );

    setElementText(
        "topbarAdminName",
        name
    );

    setElementText(
        "topbarAdminEmail",
        email
    );

    setElementText(
        "welcomeAdminName",
        name
    );

    const initials =
        getInitials(name);

    setElementText(
        "sidebarAvatar",
        initials
    );

    setElementText(
        "topbarAvatar",
        initials
    );
}

function getInitials(name) {
    const words =
        String(name || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (words.length === 0) {
        return "A";
    }

    if (words.length === 1) {
        return words[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return (
        `${words[0][0]}${words[words.length - 1][0]}`
    ).toUpperCase();
}

function initializeSidebar() {
    const menuButton =
        document.getElementById(
            "sidebarToggle"
        );

    const closeButton =
        document.getElementById(
            "sidebarClose"
        );

    const sidebar =
        document.getElementById(
            "adminSidebar"
        );

    const overlay =
        document.getElementById(
            "adminOverlay"
        );

    if (!sidebar) {
        return;
    }

    if (menuButton) {
        menuButton.addEventListener(
            "click",
            () => {
                sidebar.classList.add(
                    "open"
                );

                if (overlay) {
                    overlay.classList.add(
                        "active"
                    );
                }
            }
        );
    }

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            () => {
                closeSidebar();
            }
        );
    }

    if (overlay) {
        overlay.addEventListener(
            "click",
            () => {
                closeSidebar();
            }
        );
    }
}

function closeSidebar() {
    const sidebar =
        document.getElementById(
            "adminSidebar"
        );

    const overlay =
        document.getElementById(
            "adminOverlay"
        );

    if (sidebar) {
        sidebar.classList.remove(
            "open"
        );
    }

    if (overlay) {
        overlay.classList.remove(
            "active"
        );
    }
}

function initializeLogout() {
    const logoutButton =
        document.getElementById(
            "logoutButton"
        );

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener(
        "click",
        (event) => {
            event.preventDefault();
            logoutAdmin();
        }
    );
}

function initializeRefresh() {
    const refreshButton =
        document.getElementById(
            "refreshDashboard"
        );

    if (!refreshButton) {
        return;
    }

    refreshButton.addEventListener(
        "click",
        async () => {
            refreshButton.disabled = true;

            try {
                await loadDashboardData();
            } catch (error) {
                console.error(
                    "Dashboard refresh error:",
                    error
                );

                if (
                    error.status === 401 ||
                    error.status === 403
                ) {
                    clearAdminSession();
                    redirectToLogin();
                    return;
                }

                showDashboardError(
                    error.message ||
                    "Unable to refresh dashboard."
                );
            } finally {
                refreshButton.disabled = false;
            }
        }
    );
}

function initializeErrorDismiss() {
    const dismissButton =
        document.getElementById(
            "dismissDashboardError"
        );

    if (!dismissButton) {
        return;
    }

    dismissButton.addEventListener(
        "click",
        () => {
            hideDashboardError();
        }
    );
}

function logoutAdmin() {
    clearAdminSession();
    redirectToLogin();
}

function clearAdminSession() {
    localStorage.removeItem(
        ADMIN_ACCESS_TOKEN_KEY
    );

    localStorage.removeItem(
        ADMIN_REFRESH_TOKEN_KEY
    );

    localStorage.removeItem(
        ADMIN_USER_KEY
    );

    sessionStorage.removeItem(
        ADMIN_ACCESS_TOKEN_KEY
    );

    sessionStorage.removeItem(
        ADMIN_REFRESH_TOKEN_KEY
    );

    sessionStorage.removeItem(
        ADMIN_USER_KEY
    );

    adminToken = null;
    adminUser = null;
}

function redirectToLogin() {
    window.location.href = "index.html";
}

function setElementText(
    elementId,
    value
) {
    const element =
        document.getElementById(
            elementId
        );

    if (element) {
        element.textContent =
            value;
    }
}

function setDashboardLoadingState(
    isLoading
) {
    document.body.classList.toggle(
        "dashboard-loading",
        isLoading
    );
}

function showDashboardError(
    message
) {
    const errorElement =
        document.getElementById(
            "dashboardError"
        );

    const messageElement =
        document.getElementById(
            "dashboardErrorMessage"
        );

    if (!errorElement) {
        console.error(message);
        return;
    }

    if (messageElement) {
        messageElement.textContent =
            message;
    }

    errorElement.hidden = false;
}

function hideDashboardError() {
    const errorElement =
        document.getElementById(
            "dashboardError"
        );

    if (!errorElement) {
        return;
    }

    errorElement.hidden = true;
}

function setCurrentYear() {
    const yearElement =
        document.getElementById(
            "currentYear"
        );

    if (yearElement) {
        yearElement.textContent =
            new Date().getFullYear();
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}