const API_BASE_URL = "https://skip-fashion-backend.onrender.com";

let adminToken = null;
let adminUser = null;

let allOrders = [];
let filteredOrders = [];

let currentPage = 1;
const ORDERS_PER_PAGE = 10;

const elements = {
    sidebar: document.getElementById("adminSidebar"),
    sidebarToggle: document.getElementById("sidebarToggle"),
    sidebarClose: document.getElementById("sidebarClose"),
    adminOverlay: document.getElementById("adminOverlay"),
    logoutButton: document.getElementById("logoutButton"),
    refreshButton: document.getElementById("refreshButton"),

    adminAvatar: document.getElementById("sidebarAvatar"),
    adminName: document.getElementById("sidebarAdminName"),
    adminEmail: document.getElementById("topbarAdminEmail"),
    topbarAvatar: document.getElementById("topbarAvatar"),
    topbarAdminName: document.getElementById("topbarAdminName"),
    sidebarAdminRole: document.getElementById("sidebarAdminRole"),
    pendingOrderCount: document.getElementById("pendingOrderCount"),

    totalOrders: document.getElementById("totalOrders"),
    pendingOrders: document.getElementById("pendingOrders"),
    processingOrders: document.getElementById("processingOrders"),
    completedOrders: document.getElementById("completedOrders"),

    orderSearch: document.getElementById("orderSearch"),
    statusFilter: document.getElementById("statusFilter"),
    clearFiltersButton: document.getElementById(
        "clearFiltersButton"
    ),

    orderCountText: document.getElementById(
        "orderCountText"
    ),

    loadingState: document.getElementById("loadingState"),
    errorState: document.getElementById("errorState"),
    errorMessage: document.getElementById("errorMessage"),
    emptyState: document.getElementById("emptyState"),

    retryButton: document.getElementById("retryButton"),

    tableContainer: document.getElementById(
        "tableContainer"
    ),

    ordersTableBody: document.getElementById(
        "ordersTableBody"
    ),

    mobileOrders: document.getElementById(
        "mobileOrders"
    ),

    pagination: document.getElementById("pagination"),
    previousPage: document.getElementById(
        "previousPage"
    ),
    nextPage: document.getElementById(
        "nextPage"
    ),
    paginationInfo: document.getElementById(
        "paginationInfo"
    ),

    notification: document.getElementById(
        "notification"
    )
};


document.addEventListener(
    "DOMContentLoaded",
    initializeOrdersPage
);


async function initializeOrdersPage() {
    adminToken =
        localStorage.getItem("heritageAdminAccessToken") ||
        sessionStorage.getItem("heritageAdminAccessToken") ||
        localStorage.getItem("heritageAccessToken") ||
        sessionStorage.getItem("heritageAccessToken");

    if (!adminToken) {
        redirectToLogin();
        return;
    }

    initializeNavigation();
    initializeEvents();

    try {
        adminUser = await loadCurrentAdmin();

        renderAdminIdentity(adminUser);

        await loadOrders();

    } catch (error) {
        console.error(
            "Orders page initialization error:",
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

        showError(
            error.message ||
            "Unable to load orders."
        );
    }
}


function initializeNavigation() {
    if (!elements.sidebarToggle || !elements.sidebar) {
        return;
    }

    const closeSidebar = () => {
        elements.sidebar.classList.remove("open");

        if (elements.adminOverlay) {
            elements.adminOverlay.classList.remove("active");
        }
    };

    elements.sidebarToggle.addEventListener(
        "click",
        () => {
            elements.sidebar.classList.add("open");

            if (elements.adminOverlay) {
                elements.adminOverlay.classList.add("active");
            }
        }
    );

    elements.sidebarClose?.addEventListener(
        "click",
        closeSidebar
    );

    elements.adminOverlay?.addEventListener(
        "click",
        closeSidebar
    );

    document
        .querySelectorAll(".admin-nav-link")
        .forEach((link) => {
            link.addEventListener(
                "click",
                closeSidebar
            );
        });
}


function initializeEvents() {
    elements.logoutButton?.addEventListener(
        "click",
        handleLogout
    );

    elements.refreshButton?.addEventListener(
        "click",
        () => loadOrders()
    );

    elements.retryButton?.addEventListener(
        "click",
        () => loadOrders()
    );

    elements.orderSearch?.addEventListener(
        "input",
        applyFilters
    );

    elements.statusFilter?.addEventListener(
        "change",
        applyFilters
    );

    elements.clearFiltersButton?.addEventListener(
        "click",
        clearFilters
    );

    elements.previousPage?.addEventListener(
        "click",
        () => {
            if (currentPage > 1) {
                currentPage -= 1;
                renderOrders();
            }
        }
    );

    elements.nextPage?.addEventListener(
        "click",
        () => {
            const totalPages =
                getTotalPages();

            if (currentPage < totalPages) {
                currentPage += 1;
                renderOrders();
            }
        }
    );
}


async function apiRequest(
    endpoint,
    options = {}
) {
    const headers = {
        Accept: "application/json",
        ...(options.headers || {})
    };

    if (
        options.body &&
        !headers["Content-Type"]
    ) {
        headers["Content-Type"] =
            "application/json";
    }

    if (adminToken) {
        headers.Authorization =
            `Bearer ${adminToken}`;
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
    const response =
        await apiRequest(
            "/api/admin/auth/me"
        );

    const admin =
        response?.admin ||
        response?.data?.admin ||
        response?.user ||
        response?.data ||
        null;

    if (!admin) {
        throw new Error(
            "Unable to retrieve administrator information."
        );
    }

    return admin;
}


async function loadOrders() {
    showLoading();

    try {
        const response =
            await apiRequest(
                "/api/admin/orders"
            );

        allOrders =
            getOrdersFromResponse(response);

        updateStatistics();

        applyFilters();

    } catch (error) {
        console.error(
            "Load orders error:",
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

        showError(
            error.message ||
            "Unable to load orders."
        );
    }
}


function getOrdersFromResponse(response) {
    if (
        response &&
        Array.isArray(response.orders)
    ) {
        return response.orders;
    }

    if (
        response &&
        Array.isArray(response.data)
    ) {
        return response.data;
    }

    if (
        response &&
        response.data &&
        Array.isArray(response.data.orders)
    ) {
        return response.data.orders;
    }

    if (Array.isArray(response)) {
        return response;
    }

    return [];
}


function applyFilters() {
    const searchTerm =
        elements.orderSearch?.value
            .trim()
            .toLowerCase() || "";

    const selectedStatus =
        elements.statusFilter?.value ||
        "all";

    filteredOrders =
        allOrders.filter((order) => {
            const normalized =
                normalizeOrder(order);

            const matchesSearch =
                !searchTerm ||
                normalized.orderNumber
                    .toLowerCase()
                    .includes(searchTerm) ||
                normalized.customerName
                    .toLowerCase()
                    .includes(searchTerm) ||
                normalized.customerEmail
                    .toLowerCase()
                    .includes(searchTerm);

            const matchesStatus =
                selectedStatus === "all" ||
                normalized.status ===
                    selectedStatus;

            return (
                matchesSearch &&
                matchesStatus
            );
        });

    currentPage = 1;

    renderOrders();
}


function clearFilters() {
    if (elements.orderSearch) {
        elements.orderSearch.value = "";
    }

    if (elements.statusFilter) {
        elements.statusFilter.value = "all";
    }

    applyFilters();
}


function normalizeOrder(order) {
    const customer =
        order?.customer ||
        order?.user ||
        {};

    const customerName =
        order?.customer_name ||
        order?.customerName ||
        customer?.name ||
        [
            customer?.first_name,
            customer?.last_name
        ]
            .filter(Boolean)
            .join(" ") ||
        "Unknown customer";

    const customerEmail =
        order?.customer_email ||
        order?.customerEmail ||
        customer?.email ||
        "No email";

    const orderNumber =
        order?.order_number ||
        order?.orderNumber ||
        order?.reference ||
        order?.order_code ||
        `#${order?.id ?? "Unknown"}`;

    const status =
        String(
            order?.status ||
            order?.order_status ||
            "pending"
        )
            .trim()
            .toLowerCase();

    const paymentStatus =
        String(
            order?.payment_status ||
            order?.paymentStatus ||
            order?.payment?.status ||
            "pending"
        )
            .trim()
            .toLowerCase();

    const total =
        order?.total_amount ??
        order?.total_price ??
        order?.total ??
        order?.grand_total ??
        order?.amount ??
        0;

    const items =
        order?.items ||
        order?.order_items ||
        [];

    const itemCount =
        Array.isArray(items)
            ? items.length
            : (
                order?.item_count ??
                order?.items_count ??
                0
            );

    const createdAt =
        order?.created_at ||
        order?.createdAt ||
        order?.date ||
        order?.order_date ||
        null;

    return {
        raw: order,
        id: order?.id,
        orderNumber,
        customerName,
        customerEmail,
        status,
        paymentStatus,
        total,
        itemCount,
        createdAt
    };
}


function updateStatistics() {
    const normalizedOrders =
        allOrders.map(normalizeOrder);

    const pendingCount =
        normalizedOrders.filter(
            (order) =>
                order.status === "pending"
        ).length;

    const processingCount =
        normalizedOrders.filter(
            (order) =>
                [
                    "processing",
                    "confirmed"
                ].includes(order.status)
        ).length;

    const completedCount =
        normalizedOrders.filter(
            (order) =>
                [
                    "completed",
                    "delivered"
                ].includes(order.status)
        ).length;

    elements.totalOrders.textContent =
        normalizedOrders.length;

    elements.pendingOrders.textContent =
        pendingCount;

    elements.processingOrders.textContent =
        processingCount;

    elements.completedOrders.textContent =
        completedCount;

    if (elements.pendingOrderCount) {
        elements.pendingOrderCount.textContent =
            pendingCount;
    }
}


function renderOrders() {
    hideAllStates();

    if (!filteredOrders.length) {
        elements.emptyState.hidden = false;

        elements.orderCountText.textContent =
            "0 orders found";

        elements.pagination.hidden = true;

        return;
    }

    elements.tableContainer.hidden = false;
    elements.mobileOrders.hidden = false;

    const totalPages =
        getTotalPages();

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const startIndex =
        (currentPage - 1) *
        ORDERS_PER_PAGE;

    const endIndex =
        startIndex +
        ORDERS_PER_PAGE;

    const pageOrders =
        filteredOrders.slice(
            startIndex,
            endIndex
        );

    renderDesktopOrders(pageOrders);
    renderMobileOrders(pageOrders);

    elements.orderCountText.textContent =
        `${filteredOrders.length} ${
            filteredOrders.length === 1
                ? "order"
                : "orders"
        } found`;

    renderPagination();
}


function renderDesktopOrders(orders) {
    elements.ordersTableBody.innerHTML =
        orders
            .map((order) => {
                const normalized =
                    normalizeOrder(order);

                return `
                    <tr>
                        <td>
                            <span class="order-number">
                                ${escapeHtml(
                                    normalized.orderNumber
                                )}
                            </span>
                        </td>

                        <td>
                            <span class="customer-name">
                                ${escapeHtml(
                                    normalized.customerName
                                )}
                            </span>

                            <span class="customer-email">
                                ${escapeHtml(
                                    normalized.customerEmail
                                )}
                            </span>
                        </td>

                        <td>
                            <span class="order-date">
                                ${formatDate(
                                    normalized.createdAt
                                )}
                            </span>
                        </td>

                        <td>
                            ${escapeHtml(
                                String(
                                    normalized.itemCount
                                )
                            )}
                        </td>

                        <td>
                            <span class="order-total">
                                ${formatPrice(
                                    normalized.total
                                )}
                            </span>
                        </td>

                        <td>
                            ${createStatusBadge(
                                normalized.status
                            )}
                        </td>

                        <td>
                            ${createPaymentBadge(
                                normalized.paymentStatus
                            )}
                        </td>

                        <td>
                            <a
                                href="order-details.html?id=${encodeURIComponent(
                                    normalized.id
                                )}"
                                class="view-button"
                            >
                                View
                            </a>
                        </td>
                    </tr>
                `;
            })
            .join("");
}


function renderMobileOrders(orders) {
    elements.mobileOrders.innerHTML =
        orders
            .map((order) => {
                const normalized =
                    normalizeOrder(order);

                return `
                    <article
                        class="mobile-order-card"
                    >
                        <div
                            class="mobile-order-top"
                        >
                            <span
                                class="mobile-order-number"
                            >
                                ${escapeHtml(
                                    normalized.orderNumber
                                )}
                            </span>

                            ${createStatusBadge(
                                normalized.status
                            )}
                        </div>

                        <div
                            class="mobile-order-customer"
                        >
                            <strong>
                                ${escapeHtml(
                                    normalized.customerName
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    normalized.customerEmail
                                )}
                            </span>
                        </div>

                        <div
                            class="mobile-order-row"
                        >
                            <span>
                                Date
                            </span>

                            <span>
                                ${formatDate(
                                    normalized.createdAt
                                )}
                            </span>
                        </div>

                        <div
                            class="mobile-order-row"
                        >
                            <span>
                                Items
                            </span>

                            <span>
                                ${escapeHtml(
                                    String(
                                        normalized.itemCount
                                    )
                                )}
                            </span>
                        </div>

                        <div
                            class="mobile-order-row"
                        >
                            <span>
                                Total
                            </span>

                            <span
                                class="mobile-order-total"
                            >
                                ${formatPrice(
                                    normalized.total
                                )}
                            </span>
                        </div>

                        <div
                            class="mobile-order-row"
                        >
                            <span>
                                Payment
                            </span>

                            ${createPaymentBadge(
                                normalized.paymentStatus
                            )}
                        </div>

                        <a
                            href="order-details.html?id=${encodeURIComponent(
                                normalized.id
                            )}"
                            class="mobile-view-button"
                        >
                            View Order
                        </a>
                    </article>
                `;
            })
            .join("");
}


function openOrder(orderId) {
    if (!orderId) {
        showNotification(
            "This order does not have a valid ID.",
            true
        );

        return;
    }

    window.location.href =
        `order-details.html?id=${encodeURIComponent(
            orderId
        )}`;
}


function createStatusBadge(status) {
    const normalized =
        String(status || "pending")
            .toLowerCase()
            .trim();

    const className =
        [
            "pending",
            "processing",
            "confirmed",
            "shipped",
            "delivered",
            "completed",
            "cancelled"
        ].includes(normalized)
            ? `status-${normalized}`
            : "status-default";

    return `
        <span class="status-badge ${className}">
            ${escapeHtml(
                formatStatus(normalized)
            )}
        </span>
    `;
}


function createPaymentBadge(status) {
    const normalized =
        String(status || "pending")
            .toLowerCase()
            .trim();

    const className =
        [
            "paid",
            "pending",
            "failed",
            "cancelled"
        ].includes(normalized)
            ? `payment-${normalized}`
            : "payment-default";

    return `
        <span class="payment-badge ${className}">
            ${escapeHtml(
                formatStatus(normalized)
            )}
        </span>
    `;
}


function formatStatus(status) {
    if (!status) {
        return "Unknown";
    }

    return String(status)
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase()
        );
}


function formatPrice(value) {
    const numericValue =
        Number(value) || 0;

    return new Intl.NumberFormat(
        "en-NG",
        {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 2
        }
    ).format(numericValue);
}


function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        "en-NG",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(date);
}


function getTotalPages() {
    return Math.max(
        1,
        Math.ceil(
            filteredOrders.length /
            ORDERS_PER_PAGE
        )
    );
}


function renderPagination() {
    const totalPages =
        getTotalPages();

    if (totalPages <= 1) {
        elements.pagination.hidden = true;
        return;
    }

    elements.pagination.hidden = false;

    elements.paginationInfo.textContent =
        `Page ${currentPage} of ${totalPages}`;

    elements.previousPage.disabled =
        currentPage <= 1;

    elements.nextPage.disabled =
        currentPage >= totalPages;
}


function showLoading() {
    hideAllStates();

    elements.loadingState.hidden = false;

    elements.orderCountText.textContent =
        "Loading orders...";
}


function showError(message) {
    hideAllStates();

    elements.errorState.hidden = false;

    elements.errorMessage.textContent =
        message;

    elements.pagination.hidden = true;
}


function hideAllStates() {
    elements.loadingState.hidden = true;
    elements.errorState.hidden = true;
    elements.emptyState.hidden = true;
    elements.tableContainer.hidden = true;
    elements.mobileOrders.hidden = true;
}


function renderAdminIdentity(admin) {
    const name =
        admin?.name ||
        "Administrator";

    const email =
        admin?.email ||
        "Admin account";

    const initials =
        name
            .trim()
            .split(/\s+/)
            .map((part) => part.charAt(0))
            .slice(0, 2)
            .join("")
            .toUpperCase() || "A";

    elements.adminName.textContent = name;
    elements.adminEmail.textContent = email;
    elements.adminAvatar.textContent = initials;
    elements.topbarAvatar.textContent = initials;
    elements.topbarAdminName.textContent = name;
    elements.sidebarAdminRole.textContent =
        admin?.role || "Admin";
}


function handleLogout() {
    clearAdminSession();
    redirectToLogin();
}


function clearAdminSession() {
    localStorage.removeItem(
        "heritageAdminAccessToken"
    );

    sessionStorage.removeItem(
        "heritageAdminAccessToken"
    );

    localStorage.removeItem(
        "heritageAdminRefreshToken"
    );

    sessionStorage.removeItem(
        "heritageAdminRefreshToken"
    );

    localStorage.removeItem(
        "heritageAccessToken"
    );

    sessionStorage.removeItem(
        "heritageAccessToken"
    );

    localStorage.removeItem(
        "heritageRefreshToken"
    );

    sessionStorage.removeItem(
        "heritageRefreshToken"
    );
}


function redirectToLogin() {
    window.location.href =
        "index.html";
}


function showNotification(
    message,
    isError = false
) {
    elements.notification.textContent =
        message;

    elements.notification.classList.toggle(
        "error",
        isError
    );

    elements.notification.classList.add(
        "show"
    );

    clearTimeout(
        elements.notification._timeout
    );

    elements.notification._timeout =
        setTimeout(() => {
            elements.notification.classList.remove(
                "show"
            );
        }, 3500);
}


function escapeHtml(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function escapeAttribute(value) {
    return escapeHtml(value);
}