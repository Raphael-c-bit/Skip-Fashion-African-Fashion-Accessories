const API_BASE_URL = "https://skip-fashion-backend.onrender.com";

let adminToken = null;
let adminUser = null;
let orderId = null;
let currentOrder = null;

document.addEventListener(
    "DOMContentLoaded",
    initializeOrderDetailsPage
);


async function initializeOrderDetailsPage() {
    adminToken =
        localStorage.getItem("heritageAdminAccessToken") ||
        sessionStorage.getItem("heritageAdminAccessToken") ||
        localStorage.getItem("heritageAccessToken") ||
        sessionStorage.getItem("heritageAccessToken");

    if (!adminToken) {
        redirectToLogin();
        return;
    }

    orderId =
        new URLSearchParams(window.location.search).get("id");

    if (!orderId) {
        showError("No order ID was provided.");
        return;
    }

    initializeNavigation();
    initializeEvents();

    try {
        adminUser = await loadCurrentAdmin();

        renderAdminIdentity(adminUser);

        await loadOrder();

    } catch (error) {
        console.error(
            "Order details initialization error:",
            error
        );

        if (error.status === 401 || error.status === 422) {
            redirectToLogin();
            return;
        }

        showError(
            error.message ||
            "Unable to load the order."
        );
    }
}


/* ------------------------------
   Navigation
------------------------------ */

function initializeNavigation() {
    const menuButton =
        document.getElementById(
            "sidebarToggle"
        );

    const closeButton =
        document.getElementById(
            "sidebarClose"
        );

    const adminSidebar =
        document.getElementById(
            "adminSidebar"
        );

    const adminOverlay =
        document.getElementById(
            "adminOverlay"
        );

    if (!adminSidebar) {
        return;
    }

    const closeSidebar = () => {
        adminSidebar.classList.remove(
            "open"
        );

        adminOverlay?.classList.remove(
            "active"
        );
    };

    menuButton?.addEventListener(
        "click",
        () => {
            adminSidebar.classList.add(
                "open"
            );
            adminOverlay?.classList.add(
                "active"
            );
        }
    );

    closeButton?.addEventListener(
        "click",
        closeSidebar
    );

    adminOverlay?.addEventListener(
        "click",
        closeSidebar
    );
}


/* ------------------------------
   Events
------------------------------ */

function initializeEvents() {

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );

    if (logoutButton) {
        logoutButton.addEventListener(
            "click",
            handleLogout
        );
    }

    const retryButton =
        document.getElementById(
            "retryButton"
        );

    if (retryButton) {
        retryButton.addEventListener(
            "click",
            loadOrder
        );
    }

    const updateStatusButton =
        document.getElementById(
            "updateStatusButton"
        );

    if (updateStatusButton) {
        updateStatusButton.addEventListener(
            "click",
            handleStatusUpdate
        );
    }

    const printOrderButton =
        document.getElementById(
            "printOrderButton"
        );

    if (printOrderButton) {
        printOrderButton.addEventListener(
            "click",
            () => {
                window.print();
            }
        );
    }
}


/* ------------------------------
   Authentication
------------------------------ */

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


function redirectToLogin() {
    window.location.href =
        "index.html";
}


async function handleLogout() {

    localStorage.removeItem(
        "heritageAccessToken"
    );

    localStorage.removeItem(
        "heritageRefreshToken"
    );

    sessionStorage.removeItem(
        "heritageAccessToken"
    );

    sessionStorage.removeItem(
        "heritageRefreshToken"
    );

    window.location.href =
        "index.html";
}


/* ------------------------------
   Order Loading
------------------------------ */

async function loadOrder() {

    showLoading();

    try {

        const response =
            await apiRequest(
                `/api/admin/orders/${encodeURIComponent(orderId)}`
            );

        const order =
            response?.order ||
            response?.data?.order ||
            null;

        if (!order) {
            throw new Error(
                "The order could not be found."
            );
        }

        currentOrder = order;

        renderOrder(order);

        hideLoading();

    } catch (error) {

        console.error(
            "Load order error:",
            error
        );

        if (
            error.status === 401 ||
            error.status === 422
        ) {
            redirectToLogin();
            return;
        }

        showError(
            error.message ||
            "Unable to load this order."
        );
    }
}


/* ------------------------------
   Render Order
------------------------------ */

function renderOrder(order) {

    renderOrderHeader(order);

    renderStatus(order);

    renderCustomer(order);

    renderPayment(order);

    renderDelivery(order);

    renderItems(order);

    renderSummary(order);

    document
        .getElementById("orderContent")
        .classList.remove("hidden");
}


function renderOrderHeader(order) {

    const orderNumber =
        getOrderNumber(order);

    const orderNumberElement =
        document.getElementById(
            "orderNumber"
        );

    if (orderNumberElement) {
        orderNumberElement.textContent =
            orderNumber;
    }

    const createdAt =
        getFirstValue(
            order,
            [
                "created_at",
                "createdAt",
                "order_date",
                "date"
            ]
        );

    const createdElement =
        document.getElementById(
            "orderCreatedAt"
        );

    if (createdElement) {
        createdElement.textContent =
            createdAt
                ? formatDateTime(createdAt)
                : "Date unavailable";
    }
}


/* ------------------------------
   Status
------------------------------ */

function renderStatus(order) {

    const status =
        normalizeStatus(
            getOrderStatus(order)
        );

    const badge =
        document.getElementById(
            "orderStatusBadge"
        );

    const currentLabel =
        document.getElementById(
            "currentStatusLabel"
        );

    const select =
        document.getElementById(
            "statusSelect"
        );

    if (badge) {

        badge.textContent =
            formatStatus(status);

        badge.className =
            `status-badge ${getStatusClass(status)}`;
    }

    if (currentLabel) {

        currentLabel.textContent =
            formatStatus(status);

        currentLabel.className =
            `current-status-label ${getStatusClass(status)}`;
    }

    if (select) {

        const availableOption =
            Array.from(
                select.options
            ).some(
                option =>
                    option.value === status
            );

        if (availableOption) {
            select.value = status;
        }
    }
}


/* ------------------------------
   Customer
------------------------------ */

function renderCustomer(order) {

    const customer =
        getCustomer(order);

    const customerName =
        getCustomerName(
            order,
            customer
        );

    const customerEmail =
        getCustomerEmail(
            order,
            customer
        );

    const customerPhone =
        getCustomerPhone(
            order,
            customer
        );

    setText(
        "customerName",
        customerName || "Customer"
    );

    setText(
        "customerEmail",
        customerEmail || "No email available"
    );

    const customerEmailElement =
        document.getElementById(
            "customerEmail"
        );

    if (customerEmailElement) {

        if (customerEmail) {
            customerEmailElement.href =
                `mailto:${customerEmail}`;
        } else {
            customerEmailElement.removeAttribute(
                "href"
            );
        }
    }

    setText(
        "customerId",
        getFirstValue(
            customer,
            [
                "id",
                "customer_id",
                "user_id"
            ]
        ) ||
        getFirstValue(
            order,
            [
                "customer_id",
                "user_id"
            ]
        ) ||
        "—"
    );

    setText(
        "customerPhone",
        customerPhone || "—"
    );

    const avatar =
        document.getElementById(
            "customerAvatar"
        );

    if (avatar) {
        avatar.textContent =
            getInitials(
                customerName ||
                "Customer"
            );
    }
}


/* ------------------------------
   Payment
------------------------------ */

function renderPayment(order) {

    const payment =
        order?.payment ||
        order?.payment_details ||
        {};

    const paymentStatus =
        getFirstValue(
            order,
            [
                "payment_status",
                "paymentStatus"
            ]
        ) ||
        getFirstValue(
            payment,
            [
                "status",
                "payment_status"
            ]
        );

    const paymentMethod =
        getFirstValue(
            order,
            [
                "payment_method",
                "paymentMethod"
            ]
        ) ||
        getFirstValue(
            payment,
            [
                "method",
                "payment_method"
            ]
        );

    const paymentReference =
        getFirstValue(
            order,
            [
                "payment_reference",
                "paymentReference",
                "transaction_reference",
                "transactionReference"
            ]
        ) ||
        getFirstValue(
            payment,
            [
                "reference",
                "transaction_reference",
                "transactionReference"
            ]
        );

    const status =
        normalizePaymentStatus(
            paymentStatus
        );

    const statusElement =
        document.getElementById(
            "paymentStatus"
        );

    if (statusElement) {

        statusElement.textContent =
            paymentStatus
                ? formatStatus(paymentStatus)
                : "Unknown";

        statusElement.className =
            `payment-badge ${getPaymentStatusClass(status)}`;
    }

    setText(
        "paymentMethod",
        paymentMethod
            ? formatPaymentMethod(paymentMethod)
            : "—"
    );

    setText(
        "paymentReference",
        paymentReference || "—"
    );
}


/* ------------------------------
   Delivery
------------------------------ */

function renderDelivery(order) {

    const shipping =
        order?.shipping_address ||
        order?.shippingAddress ||
        order?.delivery_address ||
        order?.deliveryAddress ||
        order?.shipping ||
        {};

    const customer =
        getCustomer(order);

    const shippingName =
        getFirstValue(
            shipping,
            [
                "name",
                "full_name",
                "fullName",
                "recipient_name",
                "recipientName"
            ]
        ) ||
        getCustomerName(
            order,
            customer
        );

    const shippingPhone =
        getFirstValue(
            shipping,
            [
                "phone",
                "phone_number",
                "phoneNumber"
            ]
        ) ||
        getCustomerPhone(
            order,
            customer
        );

    const address =
        buildAddress(
            shipping,
            order
        );

    setText(
        "shippingName",
        shippingName || "—"
    );

    setText(
        "shippingPhone",
        shippingPhone || "—"
    );

    setText(
        "shippingAddress",
        address || "No delivery address available"
    );
}


/* ------------------------------
   Items
------------------------------ */

function renderItems(order) {

    const container =
        document.getElementById(
            "orderItems"
        );

    const items =
        getOrderItems(order);

    const itemCount =
        document.getElementById(
            "itemCount"
        );

    const totalQuantity =
        items.reduce(
            (total, item) =>
                total +
                Number(
                    getItemQuantity(item)
                ),
            0
        );

    if (itemCount) {

        itemCount.textContent =
            `${totalQuantity} ${
                totalQuantity === 1
                    ? "item"
                    : "items"
            }`;
    }

    if (!container) {
        return;
    }

    if (!items.length) {

        container.innerHTML = `
            <div class="empty-items">
                No items were found for this order.
            </div>
        `;

        return;
    }

    container.innerHTML =
        items
            .map(
                (
                    item,
                    index
                ) =>
                    createOrderItemMarkup(
                        item,
                        index
                    )
            )
            .join("");
}


function createOrderItemMarkup(
    item,
    index
) {

    const name =
        getItemName(item) ||
        `Product ${index + 1}`;

    const variant =
        getItemVariant(item);

    const quantity =
        getItemQuantity(item);

    const unitPrice =
        getItemUnitPrice(item);

    const totalPrice =
        getItemTotal(item, unitPrice, quantity);

    const image =
        getItemImage(item);

    return `
        <div class="order-item">

            <div class="item-image">

                ${
                    image
                        ? `
                            <img
                                src="${escapeHtml(image)}"
                                alt="${escapeHtml(name)}"
                                onerror="this.style.display='none'; this.parentElement.innerHTML='<span class=&quot;item-image-placeholder&quot;>◇</span>';"
                            >
                        `
                        : `
                            <span class="item-image-placeholder">
                                ◇
                            </span>
                        `
                }

            </div>

            <div class="item-details">

                <div class="item-name">
                    ${escapeHtml(name)}
                </div>

                ${
                    variant
                        ? `
                            <div class="item-variant">
                                ${escapeHtml(variant)}
                            </div>
                        `
                        : ""
                }

            </div>

            <div class="item-quantity">
                Qty: ${quantity}
            </div>

            <div class="item-price">
                ${formatCurrency(totalPrice)}
            </div>

        </div>
    `;
}


/* ------------------------------
   Summary
------------------------------ */

function renderSummary(order) {

    const subtotal =
        getNumericValue(
            order,
            [
                "subtotal",
                "subtotal_amount",
                "subtotalAmount"
            ]
        );

    const shipping =
        getNumericValue(
            order,
            [
                "shipping_amount",
                "shippingAmount",
                "shipping_fee",
                "shippingFee",
                "delivery_fee",
                "deliveryFee"
            ]
        );

    const discount =
        getNumericValue(
            order,
            [
                "discount",
                "discount_amount",
                "discountAmount"
            ]
        );

    const total =
        getNumericValue(
            order,
            [
                "total_amount",
                "totalAmount",
                "total",
                "grand_total",
                "grandTotal",
                "amount"
            ]
        );

    setText(
        "subtotalAmount",
        formatCurrency(subtotal)
    );

    setText(
        "shippingAmount",
        formatCurrency(shipping)
    );

    setText(
        "discountAmount",
        formatCurrency(discount)
    );

    setText(
        "totalAmount",
        formatCurrency(total)
    );

    const discountRow =
        document.getElementById(
            "discountRow"
        );

    if (discountRow) {

        discountRow.style.display =
            discount > 0
                ? "flex"
                : "none";
    }
}


/* ------------------------------
   Status Update
------------------------------ */

async function handleStatusUpdate() {

    if (!orderId) {
        return;
    }

    const select =
        document.getElementById(
            "statusSelect"
        );

    const button =
        document.getElementById(
            "updateStatusButton"
        );

    if (!select || !button) {
        return;
    }

    const newStatus =
        normalizeStatus(
            select.value
        );

    const currentStatus =
        normalizeStatus(
            getOrderStatus(
                currentOrder
            )
        );

    if (newStatus === currentStatus) {

        showToast(
            "The order is already using this status.",
            "error"
        );

        return;
    }

    const originalText =
        button.textContent;

    button.disabled = true;
    button.textContent =
        "Updating...";

    try {

        const response =
            await apiRequest(
                `/api/admin/orders/${encodeURIComponent(orderId)}/status`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        status: newStatus
                    })
                }
            );

        const updatedOrder =
            response?.order ||
            response?.data?.order ||
            null;

        if (updatedOrder) {
            currentOrder =
                updatedOrder;

            renderOrder(
                updatedOrder
            );
        }

        showToast(
            response?.message ||
            "Order status updated successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Status update error:",
            error
        );

        if (
            error.status === 401 ||
            error.status === 422
        ) {
            redirectToLogin();
            return;
        }

        showToast(
            error.message ||
            "Unable to update order status.",
            "error"
        );

        if (currentOrder) {
            renderStatus(
                currentOrder
            );
        }

    } finally {

        button.disabled = false;
        button.textContent =
            originalText;
    }
}


/* ------------------------------
   API
------------------------------ */

async function apiRequest(
    endpoint,
    options = {}
) {

    const headers = {
        ...(options.headers || {})
    };

    if (!headers["Content-Type"] &&
        options.body) {

        headers["Content-Type"] =
            "application/json";
    }

    if (adminToken) {

        headers["Authorization"] =
            `Bearer ${adminToken}`;
    }

    let response;

    try {

        response =
            await fetch(
                `${API_BASE_URL}${endpoint}`,
                {
                    ...options,
                    headers
                }
            );

    } catch (error) {

        const networkError =
            new Error(
                "Unable to connect to the backend server."
            );

        networkError.originalError =
            error;

        throw networkError;
    }

    let data = null;

    try {
        data = await response.json();
    } catch (error) {
        data = null;
    }

    if (!response.ok) {

        const error =
            new Error(
                data?.message ||
                `Request failed with status ${response.status}.`
            );

        error.status =
            response.status;

        error.data =
            data;

        throw error;
    }

    return data;
}


/* ------------------------------
   Helpers
------------------------------ */

function getOrderNumber(order) {

    return (
        getFirstValue(
            order,
            [
                "order_number",
                "orderNumber",
                "reference",
                "order_code",
                "orderCode"
            ]
        ) ||
        (order?.id
            ? `#${order.id}`
            : "Order")
    );
}


function getOrderStatus(order) {

    return (
        getFirstValue(
            order,
            [
                "status",
                "order_status",
                "orderStatus"
            ]
        ) ||
        "pending"
    );
}


function getCustomer(order) {

    return (
        order?.customer ||
        order?.user ||
        {}
    );
}


function getCustomerName(
    order,
    customer
) {

    return (
        getFirstValue(
            order,
            [
                "customer_name",
                "customerName"
            ]
        ) ||
        getFirstValue(
            customer,
            [
                "name",
                "full_name",
                "fullName"
            ]
        ) ||
        [
            customer?.first_name ||
            customer?.firstName,

            customer?.last_name ||
            customer?.lastName
        ]
            .filter(Boolean)
            .join(" ")
    );
}


function getCustomerEmail(
    order,
    customer
) {

    return (
        getFirstValue(
            order,
            [
                "customer_email",
                "customerEmail"
            ]
        ) ||
        getFirstValue(
            customer,
            [
                "email"
            ]
        ) ||
        ""
    );
}


function getCustomerPhone(
    order,
    customer
) {

    return (
        getFirstValue(
            order,
            [
                "customer_phone",
                "customerPhone",
                "phone",
                "phone_number"
            ]
        ) ||
        getFirstValue(
            customer,
            [
                "phone",
                "phone_number",
                "phoneNumber"
            ]
        ) ||
        ""
    );
}


function getOrderItems(order) {

    const items =
        order?.items ||
        order?.order_items ||
        order?.orderItems ||
        [];

    return Array.isArray(items)
        ? items
        : [];
}


function getItemName(item) {

    return (
        getFirstValue(
            item,
            [
                "product_name",
                "productName",
                "name",
                "title"
            ]
        ) ||
        getFirstValue(
            item?.product,
            [
                "name",
                "title"
            ]
        ) ||
        ""
    );
}


function getItemVariant(item) {

    const variant =
        item?.variant ||
        item?.product_variant ||
        item?.productVariant ||
        {};

    const color =
        getFirstValue(
            item,
            [
                "color"
            ]
        ) ||
        getFirstValue(
            variant,
            [
                "color"
            ]
        );

    const size =
        getFirstValue(
            item,
            [
                "size"
            ]
        ) ||
        getFirstValue(
            variant,
            [
                "size"
            ]
        );

    const variantName =
        getFirstValue(
            item,
            [
                "variant_name",
                "variantName"
            ]
        ) ||
        getFirstValue(
            variant,
            [
                "name"
            ]
        );

    if (variantName) {
        return variantName;
    }

    return [
        color,
        size
    ]
        .filter(Boolean)
        .join(" / ");
}


function getItemQuantity(item) {

    return (
        Number(
            getFirstValue(
                item,
                [
                    "quantity",
                    "qty"
                ]
            )
        ) || 1
    );
}


function getItemUnitPrice(item) {

    return getNumericValue(
        item,
        [
            "unit_price",
            "unitPrice",
            "price",
            "product_price",
            "productPrice"
        ]
    );
}


function getItemTotal(
    item,
    unitPrice,
    quantity
) {

    const explicitTotal =
        getNumericValue(
            item,
            [
                "total_price",
                "totalPrice",
                "subtotal",
                "subtotal_amount",
                "subtotalAmount"
            ]
        );

    if (explicitTotal > 0) {
        return explicitTotal;
    }

    return unitPrice * quantity;
}


function getItemImage(item) {

    return (
        getFirstValue(
            item,
            [
                "image_url",
                "imageUrl",
                "product_image",
                "productImage"
            ]
        ) ||
        getFirstValue(
            item?.product,
            [
                "image_url",
                "imageUrl"
            ]
        ) ||
        ""
    );
}


function buildAddress(
    shipping,
    order
) {

    const directAddress =
        getFirstValue(
            shipping,
            [
                "address",
                "full_address",
                "fullAddress"
            ]
        );

    if (directAddress) {
        return directAddress;
    }

    const parts = [
        getFirstValue(
            shipping,
            [
                "address_line_1",
                "addressLine1",
                "line1"
            ]
        ),

        getFirstValue(
            shipping,
            [
                "address_line_2",
                "addressLine2",
                "line2"
            ]
        ),

        getFirstValue(
            shipping,
            [
                "city"
            ]
        ),

        getFirstValue(
            shipping,
            [
                "state",
                "state_name",
                "stateName"
            ]
        ),

        getFirstValue(
            shipping,
            [
                "postal_code",
                "postalCode",
                "zip_code",
                "zipCode"
            ]
        )
    ].filter(Boolean);

    if (parts.length) {
        return parts.join(", ");
    }

    return (
        getFirstValue(
            order,
            [
                "shipping_address",
                "shippingAddress",
                "delivery_address",
                "deliveryAddress"
            ]
        ) ||
        ""
    );
}


function getFirstValue(
    object,
    keys
) {

    if (!object) {
        return null;
    }

    for (const key of keys) {

        const value =
            object[key];

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {
            return value;
        }
    }

    return null;
}


function getNumericValue(
    object,
    keys
) {

    const value =
        getFirstValue(
            object,
            keys
        );

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return 0;
    }

    const numeric =
        Number(
            String(value)
                .replace(/,/g, "")
                .replace(/[₦$]/g, "")
        );

    return Number.isFinite(numeric)
        ? numeric
        : 0;
}


/* ------------------------------
   Formatting
------------------------------ */

function normalizeStatus(
    status
) {

    return String(
        status || "pending"
    )
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
}


function formatStatus(
    status
) {

    return String(
        status || "pending"
    )
        .replace(/_/g, " ")
        .replace(/\b\w/g, letter =>
            letter.toUpperCase()
        );
}


function getStatusClass(
    status
) {

    const allowed = [
        "pending",
        "processing",
        "shipped",
        "completed",
        "cancelled"
    ];

    return allowed.includes(status)
        ? status
        : "default";
}


function normalizePaymentStatus(
    status
) {

    return String(
        status || "unknown"
    )
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
}


function getPaymentStatusClass(
    status
) {

    const allowed = [
        "paid",
        "pending",
        "failed",
        "cancelled"
    ];

    return allowed.includes(status)
        ? status
        : "default";
}


function formatPaymentMethod(
    method
) {

    return String(method)
        .replace(/_/g, " ")
        .replace(/\b\w/g, letter =>
            letter.toUpperCase()
        );
}


function formatCurrency(
    amount
) {

    const numericAmount =
        Number(amount) || 0;

    return new Intl.NumberFormat(
        "en-NG",
        {
            style: "currency",
            currency: "NGN",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(numericAmount);
}


function formatDateTime(
    value
) {

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }

    return new Intl.DateTimeFormat(
        "en-NG",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    ).format(date);
}


function getInitials(
    name
) {

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
            .charAt(0)
            .toUpperCase();
    }

    return (
        words[0].charAt(0) +
        words[words.length - 1].charAt(0)
    ).toUpperCase();
}


function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );

    if (element) {
        element.textContent =
            value ?? "—";
    }
}


function escapeHtml(
    value
) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ------------------------------
   Admin Identity
------------------------------ */

function renderAdminIdentity(
    admin
) {

    const name =
        admin?.name ||
        admin?.full_name ||
        admin?.fullName ||
        admin?.email ||
        "Administrator";

    const initials =
        getInitials(name);

    setText(
        "sidebarAdminName",
        name
    );

    setText(
        "topbarAdminName",
        name
    );

    setText(
        "sidebarAdminRole",
        admin?.role
            ? formatStatus(admin.role)
            : "Administrator"
    );

    const profileAvatar =
        document.getElementById(
            "profileAvatar"
        );

    if (profileAvatar) {
        profileAvatar.textContent =
            initials;
    }

    const topbarAvatar =
        document.getElementById(
            "topbarAvatar"
        );

    if (topbarAvatar) {
        topbarAvatar.textContent =
            initials;
    }
}


/* ------------------------------
   Page State
------------------------------ */

function showLoading() {

    document
        .getElementById("loadingState")
        ?.classList.remove("hidden");

    document
        .getElementById("errorState")
        ?.classList.add("hidden");

    document
        .getElementById("orderContent")
        ?.classList.add("hidden");
}


function hideLoading() {

    document
        .getElementById("loadingState")
        ?.classList.add("hidden");

    document
        .getElementById("errorState")
        ?.classList.add("hidden");
}


function showError(
    message
) {

    document
        .getElementById("loadingState")
        ?.classList.add("hidden");

    document
        .getElementById("orderContent")
        ?.classList.add("hidden");

    const errorState =
        document.getElementById(
            "errorState"
        );

    const errorMessage =
        document.getElementById(
            "errorMessage"
        );

    if (errorMessage) {
        errorMessage.textContent =
            message;
    }

    errorState?.classList.remove(
        "hidden"
    );
}


/* ------------------------------
   Toast
------------------------------ */

let toastTimeout = null;

function showToast(
    message,
    type = "success"
) {

    const toast =
        document.getElementById(
            "toast"
        );

    const toastMessage =
        document.getElementById(
            "toastMessage"
        );

    if (!toast || !toastMessage) {
        return;
    }

    toastMessage.textContent =
        message;

    toast.className =
        `toast ${type} show`;

    clearTimeout(
        toastTimeout
    );

    toastTimeout =
        setTimeout(
            () => {
                toast.classList.remove(
                    "show"
                );
            },
            3500
        );
}