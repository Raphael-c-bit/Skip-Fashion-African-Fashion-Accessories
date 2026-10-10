const API_BASE_URL = "http://127.0.0.1:5000";
const ADMIN_ACCESS_TOKEN_KEY = "heritageAdminAccessToken";
const ADMIN_REFRESH_TOKEN_KEY = "heritageAdminRefreshToken";
const ADMIN_USER_KEY = "heritageAdmin";

let allProducts = [];

document.addEventListener("DOMContentLoaded", initializeProductsPage);

async function initializeProductsPage() {
    setupSidebar();
    setupLogout();
    setupFilters();
    setupRefresh();
    setupAlerts();

    document.getElementById("currentYear").textContent = new Date().getFullYear();

    try {
        await loadAdminIdentity();
        await loadProducts();
    } catch (error) {
        console.error("Products page error:", error);
        showProductsError(
            error.message || "Unable to load products."
        );
    }
}

function getAccessToken() {
    return (
        localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY) ||
        sessionStorage.getItem(ADMIN_ACCESS_TOKEN_KEY)
    );
}

async function apiRequest(endpoint, options = {}) {
    const token = getAccessToken();

    if (!token) {
        throw new Error("You are not authenticated.");
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            `Request failed with status ${response.status}.`
        );
    }

    return data;
}

async function loadAdminIdentity() {
    const data = await apiRequest("/api/admin/auth/me");

    const user = data.admin || data.user || data;

    if (!user) {
        throw new Error("Unable to identify the administrator.");
    }

    if (user.role !== "admin") {
        throw new Error("You do not have administrator access.");
    }

    const name = user.name || "Administrator";
    const email = user.email || "";

    const sidebarName = document.getElementById("sidebarAdminName");
    const topbarName = document.getElementById("topbarAdminName");
    const topbarEmail = document.getElementById("topbarAdminEmail");

    const sidebarAvatar = document.getElementById("sidebarAvatar");
    const topbarAvatar = document.getElementById("topbarAvatar");

    sidebarName.textContent = name;
    topbarName.textContent = name;
    topbarEmail.textContent = email;

    const initial = name.trim().charAt(0).toUpperCase() || "A";

    sidebarAvatar.textContent = initial;
    topbarAvatar.textContent = initial;
}

async function loadProducts() {
    hideProductsError();

    const data = await apiRequest("/api/products/admin");

    allProducts = Array.isArray(data)
        ? data
        : Array.isArray(data.products)
            ? data.products
            : [];

    console.log("Admin products:", allProducts);

    renderProducts(allProducts);
}

function renderProducts(products) {
    const tableBody = document.getElementById("productsTableBody");
    const productCount = document.getElementById("productCount");

    const filteredProducts = applyFilters(products);

    productCount.textContent =
        `${filteredProducts.length} product${filteredProducts.length === 1 ? "" : "s"}`;

    if (!filteredProducts.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="table-empty">
                    No products found.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filteredProducts
        .map(createProductRow)
        .join("");
}

function createProductRow(product) {
    const id = product.id;

    const name = escapeHtml(
        product.name || "Unnamed Product"
    );

    const slug = escapeHtml(
        product.slug || ""
    );

    const categoryName = escapeHtml(
        product.category_name ||
        product.category?.name ||
        "Uncategorized"
    );

    const price = formatCurrency(
        product.price,
        product.currency || "NGN"
    );

    const productType = escapeHtml(
        formatProductType(product.product_type)
    );

    const isActive = Boolean(product.is_active);
    const isFeatured = Boolean(product.is_featured);

    const statusClass = isActive
        ? "status-active"
        : "status-inactive";

    const statusText = isActive
        ? "Active"
        : "Inactive";

    const featuredText = isFeatured
        ? "Yes"
        : "No";

    const createdAt = formatDate(product.created_at);

    return `
        <tr>
            <td>
                <div class="product-table-name">
                    <strong>${name}</strong>
                    <span>${slug}</span>
                </div>
            </td>

            <td>${categoryName}</td>

            <td>${price}</td>

            <td>${productType}</td>

            <td>
                <span class="product-status ${statusClass}">
                    ${statusText}
                </span>
            </td>

            <td>
                <button
                    type="button"
                    class="product-featured-button ${isFeatured ? "is-featured" : ""}"
                    data-action="featured"
                    data-id="${id}"
                    data-featured="${isFeatured}"
                    title="Toggle featured status"
                >
                    ${featuredText}
                </button>
            </td>

            <td>${createdAt}</td>

            <td>
                <div class="product-actions">
                    <a
                        href="edit-product.html?id=${encodeURIComponent(id)}"
                        class="admin-action-button"
                    >
                        Edit
                    </a>

                    <button
                        type="button"
                        class="admin-action-button ${isActive ? "action-danger" : ""}"
                        data-action="status"
                        data-id="${id}"
                        data-active="${isActive}"
                    >
                        ${isActive ? "Deactivate" : "Activate"}
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function applyFilters(products) {
    const searchTerm = document
        .getElementById("productSearch")
        .value
        .trim()
        .toLowerCase();

    const status = document.getElementById("statusFilter").value;
    const featured = document.getElementById("featuredFilter").value;

    return products.filter(product => {
        const name = String(product.name || "").toLowerCase();
        const slug = String(product.slug || "").toLowerCase();

        const matchesSearch =
            !searchTerm ||
            name.includes(searchTerm) ||
            slug.includes(searchTerm);

        const matchesStatus =
            status === "all" ||
            (status === "active" && Boolean(product.is_active)) ||
            (status === "inactive" && !Boolean(product.is_active));

        const matchesFeatured =
            featured === "all" ||
            (featured === "featured" && Boolean(product.is_featured)) ||
            (featured === "not-featured" && !Boolean(product.is_featured));

        return (
            matchesSearch &&
            matchesStatus &&
            matchesFeatured
        );
    });
}

function setupFilters() {
    document
        .getElementById("productSearch")
        .addEventListener("input", () => {
            renderProducts(allProducts);
        });

    document
        .getElementById("statusFilter")
        .addEventListener("change", () => {
            renderProducts(allProducts);
        });

    document
        .getElementById("featuredFilter")
        .addEventListener("change", () => {
            renderProducts(allProducts);
        });

    document
        .getElementById("productsTableBody")
        .addEventListener("click", handleProductAction);
}

async function handleProductAction(event) {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const productId = button.dataset.id;
    const action = button.dataset.action;

    if (!productId) {
        return;
    }

    if (action === "status") {
        await toggleProductStatus(
            productId,
            button.dataset.active === "true"
        );
    }

    if (action === "featured") {
        await toggleFeaturedStatus(
            productId,
            button.dataset.featured === "true"
        );
    }
}

async function toggleProductStatus(productId, currentlyActive) {
    const action = currentlyActive
        ? "deactivate"
        : "activate";

    const confirmed = window.confirm(
        `Are you sure you want to ${action} this product?`
    );

    if (!confirmed) {
        return;
    }

    try {
        hideProductsError();

        await apiRequest(
            `/api/products/${productId}/status`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    is_active: !currentlyActive
                })
            }
        );

        showProductsSuccess(
            `Product ${action}d successfully.`
        );

        await loadProducts();
    } catch (error) {
        console.error("Product status update error:", error);

        showProductsError(
            error.message || "Unable to update product status."
        );
    }
}

async function toggleFeaturedStatus(productId, currentlyFeatured) {
    try {
        hideProductsError();

        await apiRequest(
            `/api/products/${productId}/featured`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    is_featured: !currentlyFeatured
                })
            }
        );

        showProductsSuccess(
            currentlyFeatured
                ? "Product removed from featured products."
                : "Product marked as featured."
        );

        await loadProducts();
    } catch (error) {
        console.error("Featured status update error:", error);

        showProductsError(
            error.message || "Unable to update featured status."
        );
    }
}

function setupRefresh() {
    document
        .getElementById("refreshProducts")
        .addEventListener("click", async () => {
            const button = document.getElementById("refreshProducts");

            button.disabled = true;

            try {
                await loadProducts();
            } catch (error) {
                console.error("Refresh products error:", error);

                showProductsError(
                    error.message || "Unable to refresh products."
                );
            } finally {
                button.disabled = false;
            }
        });
}

function setupAlerts() {
    document
        .getElementById("dismissProductsError")
        .addEventListener("click", hideProductsError);

    document
        .getElementById("dismissProductsSuccess")
        .addEventListener("click", hideProductsSuccess);
}

function showProductsError(message) {
    const alert = document.getElementById("productsError");
    const messageElement = document.getElementById("productsErrorMessage");

    messageElement.textContent = message;
    alert.hidden = false;
}

function hideProductsError() {
    document.getElementById("productsError").hidden = true;
}

function showProductsSuccess(message) {
    const alert = document.getElementById("productsSuccess");
    const messageElement = document.getElementById("productsSuccessMessage");

    messageElement.textContent = message;
    alert.hidden = false;

    window.setTimeout(() => {
        hideProductsSuccess();
    }, 4000);
}

function hideProductsSuccess() {
    document.getElementById("productsSuccess").hidden = true;
}

function setupSidebar() {
    const sidebar = document.getElementById("adminSidebar");
    const overlay = document.getElementById("adminOverlay");
    const toggle = document.getElementById("sidebarToggle");
    const close = document.getElementById("sidebarClose");

    if (toggle) {
        toggle.addEventListener("click", () => {
            sidebar.classList.add("open");
            overlay.classList.add("active");
        });
    }

    if (close) {
        close.addEventListener("click", closeSidebar);
    }

    if (overlay) {
        overlay.addEventListener("click", closeSidebar);
    }

    function closeSidebar() {
        sidebar.classList.remove("open");
        overlay.classList.remove("active");
    }
}

function setupLogout() {
    const logoutButton = document.getElementById("logoutButton");

    logoutButton.addEventListener("click", () => {
        [
            ADMIN_ACCESS_TOKEN_KEY,
            ADMIN_REFRESH_TOKEN_KEY,
            ADMIN_USER_KEY,
            "heritageAccessToken",
            "heritageRefreshToken"
        ].forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        window.location.href = "index.html";
    });
}

function formatCurrency(value, currency = "NGN") {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return "—";
    }

    try {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency
        }).format(amount);
    } catch {
        return `${currency} ${amount.toLocaleString()}`;
    }
}

function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function formatProductType(value) {
    if (!value) {
        return "—";
    }

    return String(value)
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}