const API_BASE_URL = "http://127.0.0.1:5000/api";

const WHATSAPP_NUMBER = "2349164836936";

const STORAGE_KEYS = {
    user: "heritage_user",
    accessToken: "heritage_access_token",
    refreshToken: "heritage_refresh_token"
};

let currentOrders = [];

function getStoredUser() {
    const localUser = localStorage.getItem(STORAGE_KEYS.user);
    const sessionUser = sessionStorage.getItem(STORAGE_KEYS.user);

    try {
        return JSON.parse(localUser || sessionUser || "null");
    } catch {
        return null;
    }
}

function getAccessToken() {
    return (
        localStorage.getItem(STORAGE_KEYS.accessToken) ||
        sessionStorage.getItem(STORAGE_KEYS.accessToken)
    );
}

function getInitials(name) {
    if (!name) {
        return "H";
    }

    const parts = name.trim().split(/\s+/);

    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();
}

function formatCurrency(amount, currency = "NGN") {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: currency,
        maximumFractionDigits: 0
    }).format(Number(amount || 0));
}

function formatDate(dateString) {
    if (!dateString) {
        return "—";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function normalizeStatus(status) {
    return String(status || "pending")
        .toLowerCase()
        .replace(/\s+/g, "-");
}

function setUserDetails(user) {
    if (!user) {
        return;
    }

    const name = user.name || "Customer";
    const email = user.email || "Customer";
    const phone = user.phone || "Not provided";
    const initials = getInitials(name);

    const elements = {
        sidebarUserName: name,
        sidebarUserEmail: email,
        topbarUserName: name,
        welcomeName: name.split(" ")[0],
        profileName: name,
        profileEmail: email,
        profilePhone: phone,
        profileJoined: user.created_at
            ? formatDate(user.created_at)
            : "—"
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    });

    const sidebarAvatar = document.getElementById("sidebarAvatar");
    const topbarAvatar = document.getElementById("topbarAvatar");

    if (sidebarAvatar) {
        sidebarAvatar.textContent = initials;
    }

    if (topbarAvatar) {
        topbarAvatar.textContent = initials;
    }
}

async function fetchCurrentUser() {
    const token = getAccessToken();

    if (!token) {
        return null;
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error("Unable to load account information.");
    }

    const data = await response.json();

    if (!data.success || !data.user) {
        throw new Error(
            data.message || "Unable to load account information."
        );
    }

    return data.user;
}

async function fetchOrders() {
    const token = getAccessToken();

    if (!token) {
        return [];
    }

    const response = await fetch(`${API_BASE_URL}/orders`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error("Unable to load orders.");
    }

    const data = await response.json();

    if (!data.success) {
        throw new Error(
            data.message || "Unable to load orders."
        );
    }

    return Array.isArray(data.orders)
        ? data.orders
        : [];
}

async function fetchSingleOrder(orderId) {
    const token = getAccessToken();

    if (!token) {
        throw new Error("Your session has expired.");
    }

    const response = await fetch(
        `${API_BASE_URL}/orders/${encodeURIComponent(orderId)}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success || !data.order) {
        throw new Error(
            data.message || "Unable to load this order."
        );
    }

    return data.order;
}

function updateOrderStats(orders) {
    const total = orders.length;

    const pending = orders.filter(order =>
        ["pending", "processing"].includes(
            String(order.status || "").toLowerCase()
        )
    ).length;

    const completed = orders.filter(order =>
        ["completed", "delivered"].includes(
            String(order.status || "").toLowerCase()
        )
    ).length;

    const totalOrders = document.getElementById("totalOrders");
    const pendingOrders = document.getElementById("pendingOrders");
    const completedOrders = document.getElementById("completedOrders");
    const ordersNavCount = document.getElementById("ordersNavCount");

    if (totalOrders) {
        totalOrders.textContent = total;
    }

    if (pendingOrders) {
        pendingOrders.textContent = pending;
    }

    if (completedOrders) {
        completedOrders.textContent = completed;
    }

    if (ordersNavCount) {
        ordersNavCount.textContent = total;
    }
}

function renderRecentOrders(orders) {
    const container = document.getElementById("recentOrders");

    if (!container) {
        return;
    }

    if (!orders.length) {
        container.innerHTML = `
            <div class="empty-orders">
                <div class="empty-orders-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                        <path d="M6 3h12"></path>
                        <path d="M6 3v18h12V3"></path>
                        <path d="M9 8h6"></path>
                        <path d="M9 12h6"></path>
                    </svg>
                </div>

                <h4>No orders yet</h4>

                <p>
                    Your Skip Fashion orders will appear here after
                    you place your first order.
                </p>

                <a href="../pages/shop.html">Start Shopping</a>
            </div>
        `;

        return;
    }

    const recentOrders = [...orders]
        .sort(
            (a, b) =>
                new Date(b.created_at) -
                new Date(a.created_at)
        )
        .slice(0, 5);

    container.innerHTML = recentOrders
        .map(order => {
            const status = normalizeStatus(order.status);

            return `
                <div class="order-row">
                    <div class="order-main">
                        <strong class="order-number">
                            #${escapeHtml(
                                order.order_number || order.id
                            )}
                        </strong>

                        <span class="order-date">
                            ${formatDate(order.created_at)}
                        </span>
                    </div>

                    <span class="order-total">
                        ${formatCurrency(
                            order.total_amount,
                            order.currency || "NGN"
                        )}
                    </span>

                    <span class="order-status ${status}">
                        ${escapeHtml(
                            order.status || "Pending"
                        )}
                    </span>

                    <a
                        href="order-details.html?id=${encodeURIComponent(
                            order.id
                        )}"
                        class="order-view"
                    >
                        View
                    </a>
                </div>
            `;
        })
        .join("");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function updateCartCount() {
    const token = getAccessToken();
    const cartItems = document.getElementById("cartItems");
    const cartNavCount = document.getElementById("cartNavCount");

    const setCount = count => {
        if (cartItems) {
            cartItems.textContent = count;
        }

        if (cartNavCount) {
            cartNavCount.textContent = count;
        }
    };

    if (!token) {
        setCount(0);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/cart`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok || !data.success || !data.cart) {
            throw new Error(data.message || "Unable to load cart count.");
        }

        const count = Number(data.cart.total_quantity) ||
            (Array.isArray(data.cart.items)
                ? data.cart.items.reduce(
                    (total, item) => total + (Number(item.quantity) || 0),
                    0
                )
                : 0);

        setCount(count);
    } catch (error) {
        console.warn("Could not load cart count:", error);
    }
}

function renderAllOrders(orders) {
    const container = document.getElementById("allOrders");

    if (!container) {
        return;
    }

    if (!orders.length) {
        container.innerHTML = `
            <div class="empty-orders">
                <h4>No orders yet</h4>

                <p>
                    Your order history will appear here after
                    your first purchase.
                </p>

                <a href="../pages/shop.html">
                    Start Shopping
                </a>
            </div>
        `;

        updateWhatsAppButton(orders);

        return;
    }

    container.innerHTML = [...orders]
        .sort(
            (first, second) =>
                new Date(second.created_at) -
                new Date(first.created_at)
        )
        .map(order => {
            const canCancel = ["pending", "processing"].includes(
                String(order.status || "").toLowerCase()
            );

            return `
                <div class="order-row">
                    <div class="order-main">
                        <strong class="order-number">
                            #${escapeHtml(
                                order.order_number || order.id
                            )}
                        </strong>

                        <span class="order-date">
                            ${formatDate(order.created_at)}
                        </span>
                    </div>

                    <span class="order-total">
                        ${formatCurrency(
                            order.total_amount,
                            order.currency || "NGN"
                        )}
                    </span>

                    <span class="order-status ${normalizeStatus(
                        order.status
                    )}">
                        ${escapeHtml(
                            order.status || "Pending"
                        )}
                    </span>

                    <div class="order-actions">
                        <a
                            href="order-details.html?id=${encodeURIComponent(
                                order.id
                            )}"
                            class="order-view"
                        >
                            View details
                        </a>
                        ${canCancel ? `
                            <button
                                type="button"
                                class="order-cancel-button"
                                data-order-id="${encodeURIComponent(order.id)}"
                                data-order-number="${escapeHtml(
                                    order.order_number || order.id
                                )}"
                            >
                                Cancel order
                            </button>
                        ` : ""}
                    </div>
                </div>
            `;
        })
        .join("");

    container.querySelectorAll(".order-cancel-button").forEach(button => {
        button.addEventListener("click", () => {
            cancelOrder(button.dataset.orderId, button.dataset.orderNumber, button);
        });
    });

    updateWhatsAppButton(orders);
}

async function cancelOrder(orderId, orderNumber, button) {
    if (!window.confirm(`Cancel order #${orderNumber}? This action cannot be undone.`)) {
        return;
    }

    const token = getAccessToken();

    if (!token) {
        window.alert("Your session has expired. Please sign in again.");
        return;
    }

    button.disabled = true;
    button.textContent = "Cancelling...";

    try {
        const response = await fetch(
            `${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/cancel`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        const data = await response.json();

        if (!response.ok || !data.success || !data.order) {
            throw new Error(data.message || "Unable to cancel this order.");
        }

        currentOrders = currentOrders.map(order =>
            String(order.id) === String(data.order.id)
                ? data.order
                : order
        );

        updateOrderStats(currentOrders);
        renderAllOrders(currentOrders);
    } catch (error) {
        button.disabled = false;
        button.textContent = "Cancel order";
        window.alert(error.message || "Unable to cancel this order. Please try again.");
    }
}

function updateWhatsAppButton(orders) {
    const button = document.getElementById(
        "sendOrdersWhatsApp"
    );

    const note = document.querySelector(
        ".orders-whatsapp-note"
    );

    if (!button) {
        return;
    }

    const activeOrders = orders.filter(order =>
        ["pending", "processing"].includes(
            String(order.status || "").toLowerCase()
        )
    );

    button.disabled = activeOrders.length === 0;

    if (activeOrders.length === 0) {
        button.setAttribute("aria-disabled", "true");

        if (note) {
            note.textContent =
                "You currently have no pending or processing orders to send via WhatsApp.";
        }
    } else {
        button.removeAttribute("aria-disabled");

        if (note) {
            note.textContent =
                `Send your ${activeOrders.length} active order${
                    activeOrders.length === 1 ? "" : "s"
                } together in one WhatsApp message.`;
        }
    }
}

function formatOrderItemForWhatsApp(item, currency) {
    const productName =
        item.product_name ||
        item.name ||
        "Product";

    const variantName =
        item.variant_name ||
        item.variant ||
        "";

    const quantity =
        Number(item.quantity) || 0;

    const subtotal =
        Number(item.subtotal) || 0;

    let itemName = productName;

    if (variantName) {
        itemName += ` (${variantName})`;
    }

    return `• ${itemName} × ${quantity} — ${formatCurrency(
        subtotal,
        currency
    )}`;
}

function buildWhatsAppOrderMessage(orders) {
    const customer = getStoredUser();

    const customerName =
        customer?.name || "Customer";

    const activeOrders = orders.filter(order =>
        ["pending", "processing"].includes(
            String(order.status || "").toLowerCase()
        )
    );

    let message =
        `Hello Skip Fashion,\n\n` +
        `My name is ${customerName}. ` +
        `I would like to follow up on my active orders.\n\n`;

    message += `*ACTIVE ORDERS (${activeOrders.length})*\n\n`;

    activeOrders.forEach((order, index) => {
        const currency =
            order.currency || "NGN";

        message +=
            `*${index + 1}. Order #${
                order.order_number || order.id
            }*\n`;

        message +=
            `Date: ${formatDate(
                order.created_at
            )}\n`;

        message +=
            `Status: ${
                order.status || "Pending"
            }\n`;

        if (
            Array.isArray(order.items) &&
            order.items.length
        ) {
            message += `Items:\n`;

            order.items.forEach(item => {
                message +=
                    formatOrderItemForWhatsApp(
                        item,
                        currency
                    ) + "\n";
            });
        }

        message +=
            `Total: ${formatCurrency(
                order.total_amount,
                currency
            )}\n`;

        if (order.shipping_name) {
            message +=
                `Recipient: ${order.shipping_name}\n`;
        }

        if (order.shipping_phone) {
            message +=
                `Phone: ${order.shipping_phone}\n`;
        }

        if (
            order.shipping_address ||
            order.shipping_city ||
            order.shipping_state
        ) {
            const address = [
                order.shipping_address,
                order.shipping_city,
                order.shipping_state
            ]
                .filter(Boolean)
                .join(", ");

            message += `Delivery Address: ${address}\n`;
        }

        message += `\n`;
    });

    message +=
        `Please assist me with the next steps for these orders.\n\n` +
        `Thank you.`;

    return message;
}

async function sendOrdersViaWhatsApp() {
    const button = document.getElementById(
        "sendOrdersWhatsApp"
    );

    if (!button) {
        return;
    }

    const activeOrders = currentOrders.filter(order =>
        ["pending", "processing"].includes(
            String(order.status || "").toLowerCase()
        )
    );

    if (!activeOrders.length) {
        alert(
            "You do not have any pending or processing orders to send."
        );

        return;
    }

    const originalButtonContent =
        button.innerHTML;

    button.disabled = true;

    button.innerHTML = `
        <span>Preparing WhatsApp message...</span>
    `;

    /*
     * Open a blank tab immediately so the browser
     * does not block the WhatsApp window after
     * the API requests finish.
     */
    const whatsappWindow = window.open(
        "about:blank",
        "_blank"
    );

    try {
        const detailedOrders = await Promise.all(
            activeOrders.map(async order => {
                try {
                    return await fetchSingleOrder(
                        order.id
                    );
                } catch (error) {
                    console.warn(
                        `Could not load details for order ${order.id}:`,
                        error
                    );

                    return order;
                }
            })
        );

        const message =
            buildWhatsAppOrderMessage(
                detailedOrders
            );

        const whatsappUrl =
            `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                message
            )}`;

        if (whatsappWindow) {
            whatsappWindow.location.href =
                whatsappUrl;
        } else {
            window.location.href =
                whatsappUrl;
        }
    } catch (error) {
        console.error(
            "Could not prepare WhatsApp message:",
            error
        );

        if (whatsappWindow) {
            whatsappWindow.close();
        }

        alert(
            "We could not prepare your WhatsApp message. Please try again."
        );
    } finally {
        button.disabled = false;
        button.innerHTML =
            originalButtonContent;
    }
}

function setupOrdersWhatsApp() {
    const button = document.getElementById(
        "sendOrdersWhatsApp"
    );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        sendOrdersViaWhatsApp
    );

    updateWhatsAppButton(currentOrders);
}

async function renderOrderDetails() {
    const container =
        document.getElementById("orderDetail");

    if (!container) {
        return;
    }

    const orderId =
        new URLSearchParams(
            window.location.search
        ).get("id");

    if (
        !orderId ||
        !/^\d+$/.test(orderId)
    ) {
        container.innerHTML = `
            <div class="empty-orders">
                <h4>Order not found</h4>

                <p>
                    Choose an order from your order
                    history to view its details.
                </p>

                <a href="orders.html">
                    View My Orders
                </a>
            </div>
        `;

        return;
    }

    try {
        const order =
            await fetchSingleOrder(orderId);

        const items = Array.isArray(
            order.items
        )
            ? order.items
            : [];

        container.innerHTML = `
            <article class="dashboard-card">
                <div class="card-header">
                    <div>
                        <span class="card-eyebrow">
                            ORDER PLACED
                            ${formatDate(
                                order.created_at
                            )}
                        </span>

                        <h3>
                            #${escapeHtml(
                                order.order_number ||
                                order.id
                            )}
                        </h3>
                    </div>

                    <span class="order-status ${normalizeStatus(
                        order.status
                    )}">
                        ${escapeHtml(
                            order.status ||
                            "Pending"
                        )}
                    </span>
                </div>

                <div class="info-list">

                    ${
                        items
                            .map(
                                item => `
                                    <div class="info-item">
                                        <span class="info-label">
                                            ${escapeHtml(
                                                item.product_name
                                            )}

                                            ${
                                                item.variant_name
                                                    ? ` · ${escapeHtml(
                                                          item.variant_name
                                                      )}`
                                                    : ""
                                            }

                                            × ${
                                                Number(
                                                    item.quantity
                                                ) || 0
                                            }
                                        </span>

                                        <strong class="info-value">
                                            ${formatCurrency(
                                                item.subtotal,
                                                order.currency ||
                                                    "NGN"
                                            )}
                                        </strong>
                                    </div>
                                `
                            )
                            .join("")
                    }

                    ${
                        !items.length
                            ? `
                                <p class="order-detail-note">
                                    No item details are available
                                    for this order.
                                </p>
                            `
                            : ""
                    }

                    <div class="info-item">
                        <span class="info-label">
                            SUBTOTAL
                        </span>

                        <strong class="info-value">
                            ${formatCurrency(
                                order.subtotal,
                                order.currency ||
                                    "NGN"
                            )}
                        </strong>
                    </div>

                    <div class="info-item">
                        <span class="info-label">
                            DELIVERY
                        </span>

                        <strong class="info-value">
                            ${formatCurrency(
                                order.shipping_fee,
                                order.currency ||
                                    "NGN"
                            )}
                        </strong>
                    </div>

                    <div class="info-item">
                        <span class="info-label">
                            TOTAL
                        </span>

                        <strong class="info-value">
                            ${formatCurrency(
                                order.total_amount,
                                order.currency ||
                                    "NGN"
                            )}
                        </strong>
                    </div>

                </div>
            </article>

            <article class="dashboard-card order-shipping-card">

                <div class="card-header">
                    <div>
                        <span class="card-eyebrow">
                            DELIVERY
                        </span>

                        <h3>
                            Shipping details
                        </h3>
                    </div>
                </div>

                <div class="info-list">

                    <div class="info-item">
                        <span class="info-label">
                            RECIPIENT
                        </span>

                        <strong class="info-value">
                            ${escapeHtml(
                                order.shipping_name ||
                                    "—"
                            )}
                        </strong>
                    </div>

                    <div class="info-item">
                        <span class="info-label">
                            PHONE
                        </span>

                        <strong class="info-value">
                            ${escapeHtml(
                                order.shipping_phone ||
                                    "—"
                            )}
                        </strong>
                    </div>

                    <div class="info-item">
                        <span class="info-label">
                            ADDRESS
                        </span>

                        <strong class="info-value">
                            ${escapeHtml(
                                [
                                    order.shipping_address,
                                    order.shipping_city,
                                    order.shipping_state
                                ]
                                    .filter(Boolean)
                                    .join(", ") ||
                                    "—"
                            )}
                        </strong>
                    </div>

                    <div class="info-item">
                        <span class="info-label">
                            PAYMENT
                        </span>

                        <strong class="info-value">
                            ${escapeHtml(
                                order.payment_status ||
                                    "Pending"
                            )}
                        </strong>
                    </div>

                </div>

            </article>
        `;
    } catch (error) {
        container.innerHTML = `
            <div class="empty-orders">
                <h4>Order unavailable</h4>

                <p>
                    ${escapeHtml(
                        error.message ||
                            "Please try again shortly."
                    )}
                </p>

                <a href="orders.html">
                    Back to My Orders
                </a>
            </div>
        `;
    }
}

function setupSidebar() {
    const toggle =
        document.getElementById(
            "mobileSidebarToggle"
        );

    const sidebar =
        document.getElementById(
            "accountSidebar"
        );

    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );

    if (!toggle || !sidebar || !overlay) {
        return;
    }

    const closeSidebar = () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("active");
    };

    toggle.addEventListener(
        "click",
        () => {
            sidebar.classList.toggle("open");

            overlay.classList.toggle(
                "active",
                sidebar.classList.contains(
                    "open"
                )
            );
        }
    );

    overlay.addEventListener(
        "click",
        closeSidebar
    );

    document
        .querySelectorAll(
            ".account-nav-item"
        )
        .forEach(link => {
            link.addEventListener(
                "click",
                () => {
                    closeSidebar();
                }
            );
        });
}

function setupSignOut() {
    const signOutButton =
        document.getElementById(
            "signOutButton"
        );

    if (!signOutButton) {
        return;
    }

    signOutButton.addEventListener(
        "click",
        () => {
            localStorage.removeItem(
                STORAGE_KEYS.user
            );

            localStorage.removeItem(
                STORAGE_KEYS.accessToken
            );

            localStorage.removeItem(
                STORAGE_KEYS.refreshToken
            );

            sessionStorage.removeItem(
                STORAGE_KEYS.user
            );

            sessionStorage.removeItem(
                STORAGE_KEYS.accessToken
            );

            sessionStorage.removeItem(
                STORAGE_KEYS.refreshToken
            );

            window.location.href =
                "../auth/login.html";
        }
    );
}

function requireAuthentication() {
    const token = getAccessToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
        window.location.href =
            "../auth/login.html?redirect=account";

        return false;
    }

    return true;
}

async function initializeDashboard() {
    if (!requireAuthentication()) {
        return;
    }

    const storedUser =
        getStoredUser();

    setUserDetails(storedUser);

    await updateCartCount();

    setupSidebar();

    setupSignOut();

    setupOrdersWhatsApp();

    try {
        const user =
            await fetchCurrentUser();

        if (user) {
            setUserDetails(user);
        }
    } catch (error) {
        console.warn(
            "Could not refresh user information:",
            error
        );
    }

    try {
        const orders =
            await fetchOrders();

        currentOrders = orders;

        updateOrderStats(orders);

        renderRecentOrders(orders);

        renderAllOrders(orders);

        updateWhatsAppButton(orders);
    } catch (error) {
        console.error(
            "Could not load orders:",
            error
        );

        currentOrders = [];

        updateWhatsAppButton([]);

        [
            "recentOrders",
            "allOrders"
        ].forEach(id => {
            const container =
                document.getElementById(id);

            if (!container) {
                return;
            }

            container.innerHTML = `
                <div class="empty-orders">

                    <div class="empty-orders-icon">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.7"
                        >
                            <circle
                                cx="12"
                                cy="12"
                                r="9"
                            ></circle>

                            <path
                                d="M12 8v4"
                            ></path>

                            <circle
                                cx="12"
                                cy="16"
                                r=".7"
                                fill="currentColor"
                                stroke="none"
                            ></circle>
                        </svg>
                    </div>

                    <h4>
                        Orders unavailable
                    </h4>

                    <p>
                        We could not load your orders
                        right now. Please try again
                        shortly.
                    </p>

                </div>
            `;
        });
    }

    await renderOrderDetails();
}

document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
);