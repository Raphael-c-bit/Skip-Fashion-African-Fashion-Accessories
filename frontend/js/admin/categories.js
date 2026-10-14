const API_BASE_URL = "http://127.0.0.1:5000";
const ADMIN_ACCESS_TOKEN_KEY = "heritageAdminAccessToken";
const ADMIN_REFRESH_TOKEN_KEY = "heritageAdminRefreshToken";
const ADMIN_USER_KEY = "heritageAdmin";

let adminToken = null;
let adminUser = null;
let categories = [];
let filteredCategories = [];
let categoryToDelete = null;

document.addEventListener("DOMContentLoaded", initializeCategories);

async function initializeCategories() {
    adminToken =
        localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY) ||
        sessionStorage.getItem(ADMIN_ACCESS_TOKEN_KEY);

    if (!adminToken) {
        redirectToLogin();
        return;
    }

    setupEventListeners();

    const authenticated = await verifyAdmin();

    if (!authenticated) {
        return;
    }

    await loadCategories();
}

function redirectToLogin() {
    window.location.href = "index.html";
}

async function verifyAdmin() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/admin/auth/me`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${adminToken}`
                }
            }
        );

        if (!response.ok) {
            clearAdminSession();
            redirectToLogin();
            return false;
        }

        const data = await response.json();

        adminUser = data.user || data.admin || null;

        if (adminUser) {
            updateAdminIdentity(adminUser);
        }

        return true;

    } catch (error) {
        console.error("Admin verification failed:", error);

        showToast(
            "Unable to connect to the backend.",
            true
        );

        return false;
    }
}

function updateAdminIdentity(user) {
    const name =
        user.name ||
        user.full_name ||
        "Administrator";

    ["adminName", "sidebarAdminName"].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = name;
        }
    });

    ["adminAvatar", "sidebarAvatar"].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = getInitials(name);
        }
    });
}

function getInitials(name) {
    return String(name)
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("") || "H";
}

function setupEventListeners() {
    const searchInput =
        document.getElementById("categorySearch");

    const statusFilter =
        document.getElementById("statusFilter");

    const addButton =
        document.getElementById("addCategoryButton");

    const emptyAddButton =
        document.getElementById("emptyAddButton");

    const refreshButton =
        document.getElementById("refreshButton");

    const logoutButton =
        document.getElementById("logoutButton");

    const categoryForm =
        document.getElementById("categoryForm");

    const closeModalButton =
        document.getElementById("closeModalButton");

    const cancelModalButton =
        document.getElementById("cancelModalButton");

    const cancelDeleteButton =
        document.getElementById("cancelDeleteButton");

    const confirmDeleteButton =
        document.getElementById("confirmDeleteButton");

    const mobileMenuButton =
        document.getElementById("mobileMenuButton");
    const sidebarClose =
        document.getElementById("sidebarClose");
    const adminOverlay =
        document.getElementById("adminOverlay");

    searchInput?.addEventListener(
        "input",
        applyFilters
    );

    statusFilter?.addEventListener(
        "change",
        applyFilters
    );

    addButton?.addEventListener(
        "click",
        openAddModal
    );

    emptyAddButton?.addEventListener(
        "click",
        openAddModal
    );

    refreshButton?.addEventListener(
        "click",
        loadCategories
    );

    logoutButton?.addEventListener(
        "click",
        logout
    );

    categoryForm?.addEventListener(
        "submit",
        saveCategory
    );

    closeModalButton?.addEventListener(
        "click",
        closeCategoryModal
    );

    cancelModalButton?.addEventListener(
        "click",
        closeCategoryModal
    );

    cancelDeleteButton?.addEventListener(
        "click",
        closeDeleteModal
    );

    confirmDeleteButton?.addEventListener(
        "click",
        deleteCategory
    );

    mobileMenuButton?.addEventListener(
        "click",
        toggleMobileSidebar
    );

    sidebarClose?.addEventListener(
        "click",
        closeMobileSidebar
    );

    adminOverlay?.addEventListener(
        "click",
        closeMobileSidebar
    );

    document
        .getElementById("categoryName")
        ?.addEventListener(
            "input",
            handleCategoryNameInput
        );

    document
        .getElementById("categoryModal")
        ?.addEventListener(
            "click",
            event => {
                if (
                    event.target.id ===
                    "categoryModal"
                ) {
                    closeCategoryModal();
                }
            }
        );

    document
        .getElementById("deleteModal")
        ?.addEventListener(
            "click",
            event => {
                if (
                    event.target.id ===
                    "deleteModal"
                ) {
                    closeDeleteModal();
                }
            }
        );
}

async function loadCategories() {
    setTableLoading();

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/admin/categories`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${adminToken}`
                }
            }
        );

        const data = await parseResponse(response);

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Failed to load categories."
            );
        }

        categories =
            Array.isArray(data.categories)
                ? data.categories
                : [];

        applyFilters();

    } catch (error) {
        console.error(
            "Category loading error:",
            error
        );

        renderError(
            error.message ||
            "Unable to load categories."
        );
    }
}

function applyFilters() {
    const search =
        document
            .getElementById("categorySearch")
            ?.value
            .trim()
            .toLowerCase() || "";

    const status =
        document
            .getElementById("statusFilter")
            ?.value || "all";

    filteredCategories =
        categories.filter(category => {

            const name =
                String(
                    category.name || ""
                ).toLowerCase();

            const slug =
                String(
                    category.slug || ""
                ).toLowerCase();

            const description =
                String(
                    category.description || ""
                ).toLowerCase();

            const matchesSearch =
                !search ||
                name.includes(search) ||
                slug.includes(search) ||
                description.includes(search);

            const active =
                category.is_active !== false;

            const matchesStatus =
                status === "all" ||
                (status === "active" && active) ||
                (status === "inactive" && !active);

            return (
                matchesSearch &&
                matchesStatus
            );
        });

    renderCategories();
    updateStats();
}

function renderCategories() {
    const tbody =
        document.getElementById(
            "categoryTableBody"
        );

    const emptyState =
        document.getElementById("emptyState");

    if (!tbody) {
        return;
    }

    if (!filteredCategories.length) {
        tbody.innerHTML = "";
        emptyState?.classList.remove("hidden");
        updateResultText();
        return;
    }

    emptyState?.classList.add("hidden");

    tbody.innerHTML =
        filteredCategories
            .map(category => {
                return createCategoryRow(category);
            })
            .join("");

    updateResultText();
}

function createCategoryRow(category) {
    const id = category.id;

    const name =
        escapeHtml(
            category.name ||
            "Unnamed Category"
        );

    const slug =
        escapeHtml(
            category.slug ||
            "-"
        );

    const description =
        escapeHtml(
            category.description ||
            "No description"
        );

    const active =
        category.is_active !== false;

    const productCount =
        getProductCount(category);

    const createdAt =
        formatDate(
            category.created_at
        );

    const initials =
        getInitials(
            category.name ||
            "Category"
        );

    return `
        <tr>
            <td>
                <div class="category-name">
                    <div class="category-avatar">
                        ${escapeHtml(initials)}
                    </div>

                    <div>
                        <strong>
                            ${name}
                        </strong>

                        <span title="${description}">
                            ${description}
                        </span>
                    </div>
                </div>
            </td>

            <td>
                <span class="slug-text">
                    ${slug}
                </span>
            </td>

            <td>
                <span class="product-count">
                    ${productCount}
                </span>
            </td>

            <td>
                <span class="status-badge ${
                    active
                        ? "active"
                        : "inactive"
                }">
                    <span class="status-dot"></span>
                    ${
                        active
                            ? "Active"
                            : "Inactive"
                    }
                </span>
            </td>

            <td>
                <span class="date-text">
                    ${createdAt}
                </span>
            </td>

            <td>
                <div class="action-buttons">

                    <button
                        type="button"
                        class="table-action"
                        data-action="edit"
                        data-id="${id}"
                        title="Edit category"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="table-action ${
                            active
                                ? "toggle-inactive"
                                : "toggle-active"
                        }"
                        data-action="toggle"
                        data-id="${id}"
                        title="${
                            active
                                ? "Deactivate category"
                                : "Activate category"
                        }"
                    >
                        ${
                            active
                                ? "Off"
                                : "On"
                        }
                    </button>

                    <button
                        type="button"
                        class="table-action delete-action"
                        data-action="delete"
                        data-id="${id}"
                        title="Delete category"
                    >
                        Delete
                    </button>

                </div>
            </td>
        </tr>
    `;
}

document.addEventListener(
    "click",
    event => {
        const button =
            event.target.closest(
                "[data-action]"
            );

        if (!button) {
            return;
        }

        const action =
            button.dataset.action;

        const id =
            Number(button.dataset.id);

        const category =
            categories.find(
                item =>
                    Number(item.id) === id
            );

        if (!category) {
            return;
        }

        if (action === "edit") {
            openEditModal(category);
        }

        if (action === "toggle") {
            toggleCategory(category);
        }

        if (action === "delete") {
            openDeleteModal(category);
        }
    }
);

function openAddModal() {
    const form =
        document.getElementById(
            "categoryForm"
        );

    form?.reset();

    document.getElementById(
        "categoryId"
    ).value = "";

    document.getElementById(
        "categoryActive"
    ).checked = true;

    document.getElementById(
        "modalTitle"
    ).textContent = "Add Category";

    document.getElementById(
        "categorySlug"
    ).value = "";

    document
        .getElementById("categoryModal")
        ?.classList.remove("hidden");

    setTimeout(() => {
        document
            .getElementById("categoryName")
            ?.focus();
    }, 100);
}

function openEditModal(category) {
    document.getElementById(
        "categoryId"
    ).value = category.id;

    document.getElementById(
        "categoryName"
    ).value = category.name || "";

    document.getElementById(
        "categorySlug"
    ).value = category.slug || "";

    document.getElementById(
        "categoryDescription"
    ).value =
        category.description || "";

    document.getElementById(
        "categoryActive"
    ).checked =
        category.is_active !== false;

    document.getElementById(
        "modalTitle"
    ).textContent = "Edit Category";

    document
        .getElementById("categoryModal")
        ?.classList.remove("hidden");

    setTimeout(() => {
        document
            .getElementById("categoryName")
            ?.focus();
    }, 100);
}

function closeCategoryModal() {
    document
        .getElementById("categoryModal")
        ?.classList.add("hidden");
}

function handleCategoryNameInput(event) {
    const categoryId =
        document.getElementById(
            "categoryId"
        ).value;

    const slugInput =
        document.getElementById(
            "categorySlug"
        );

    if (!slugInput) {
        return;
    }

    if (categoryId) {
        return;
    }

    slugInput.value =
        generateSlug(
            event.target.value
        );
}

function generateSlug(value) {
    return String(value)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

async function saveCategory(event) {
    event.preventDefault();

    const id =
        document.getElementById(
            "categoryId"
        ).value;

    const name =
        document.getElementById(
            "categoryName"
        ).value.trim();

    const slug =
        document.getElementById(
            "categorySlug"
        ).value.trim();

    const description =
        document.getElementById(
            "categoryDescription"
        ).value.trim();

    const isActive =
        document.getElementById(
            "categoryActive"
        ).checked;

    if (!name) {
        showToast(
            "Category name is required.",
            true
        );
        return;
    }

    if (!slug) {
        showToast(
            "Category slug is required.",
            true
        );
        return;
    }

    const saveButton =
        document.getElementById(
            "saveCategoryButton"
        );

    const originalText =
        saveButton.textContent;

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    const body = {
        name,
        slug,
        description,
        is_active: isActive
    };

    try {
        const url = id
            ? `${API_BASE_URL}/api/admin/categories/${id}`
            : `${API_BASE_URL}/api/admin/categories`;

        const method =
            id ? "PUT" : "POST";

        const response = await fetch(
            url,
            {
                method,
                headers: {
                    Authorization:
                        `Bearer ${adminToken}`,
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify(body)
            }
        );

        const data =
            await parseResponse(response);

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Unable to save category."
            );
        }

        closeCategoryModal();

        showToast(
            id
                ? "Category updated successfully."
                : "Category created successfully."
        );

        await loadCategories();

    } catch (error) {
        console.error(
            "Save category error:",
            error
        );

        showToast(
            error.message ||
            "Unable to save category.",
            true
        );

    } finally {
        saveButton.disabled = false;
        saveButton.textContent = originalText;
    }
}

async function toggleCategory(category) {
    const currentStatus =
        category.is_active !== false;

    const newStatus =
        !currentStatus;

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/admin/categories/${category.id}/status`,
            {
                method: "PATCH",
                headers: {
                    Authorization:
                        `Bearer ${adminToken}`,
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    is_active: newStatus
                })
            }
        );

        const data =
            await parseResponse(response);

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Unable to update category status."
            );
        }

        showToast(
            newStatus
                ? "Category activated."
                : "Category deactivated."
        );

        await loadCategories();

    } catch (error) {
        console.error(
            "Toggle category error:",
            error
        );

        showToast(
            error.message ||
            "Unable to update category status.",
            true
        );
    }
}

function openDeleteModal(category) {
    categoryToDelete = category;

    const message =
        document.getElementById(
            "deleteMessage"
        );

    message.textContent =
        `Are you sure you want to delete "${category.name}"? This action cannot be undone.`;

    document
        .getElementById("deleteModal")
        ?.classList.remove("hidden");
}

function closeDeleteModal() {
    categoryToDelete = null;

    document
        .getElementById("deleteModal")
        ?.classList.add("hidden");
}

async function deleteCategory() {
    if (!categoryToDelete) {
        return;
    }

    const category =
        categoryToDelete;

    const button =
        document.getElementById(
            "confirmDeleteButton"
        );

    const originalText =
        button.textContent;

    button.disabled = true;
    button.textContent = "Deleting...";

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/admin/categories/${category.id}`,
            {
                method: "DELETE",
                headers: {
                    Authorization:
                        `Bearer ${adminToken}`
                }
            }
        );

        const data =
            await parseResponse(response);

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Unable to delete category."
            );
        }

        closeDeleteModal();

        showToast(
            "Category deleted successfully."
        );

        await loadCategories();

    } catch (error) {
        console.error(
            "Delete category error:",
            error
        );

        showToast(
            error.message ||
            "Unable to delete category.",
            true
        );

    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

function updateStats() {
    const total =
        categories.length;

    const active =
        categories.filter(
            category =>
                category.is_active !== false
        ).length;

    const inactive =
        total - active;

    const products =
        categories.reduce(
            (sum, category) =>
                sum +
                getProductCount(category),
            0
        );

    document.getElementById(
        "totalCategories"
    ).textContent = total;

    document.getElementById(
        "activeCategories"
    ).textContent = active;

    document.getElementById(
        "inactiveCategories"
    ).textContent = inactive;

    document.getElementById(
        "totalCategoryProducts"
    ).textContent = products;
}

function updateResultText() {
    const resultText =
        document.getElementById(
            "categoryResultText"
        );

    if (!resultText) {
        return;
    }

    const count =
        filteredCategories.length;

    resultText.textContent =
        count === 1
            ? "1 category found"
            : `${count} categories found`;
}

function getProductCount(category) {
    if (
        typeof category.product_count ===
        "number"
    ) {
        return category.product_count;
    }

    if (
        typeof category.products_count ===
        "number"
    ) {
        return category.products_count;
    }

    if (
        Array.isArray(category.products)
    ) {
        return category.products.length;
    }

    return 0;
}

function setTableLoading() {
    const tbody =
        document.getElementById(
            "categoryTableBody"
        );

    document
        .getElementById("emptyState")
        ?.classList.add("hidden");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="6">
                <div class="table-loading">
                    <div class="loading-spinner"></div>
                    <span>
                        Loading categories...
                    </span>
                </div>
            </td>
        </tr>
    `;
}

function renderError(message) {
    const tbody =
        document.getElementById(
            "categoryTableBody"
        );

    document
        .getElementById("emptyState")
        ?.classList.add("hidden");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="6">
                <div class="table-loading">
                    <strong>
                        Unable to load categories
                    </strong>

                    <span>
                        ${escapeHtml(message)}
                    </span>

                    <button
                        type="button"
                        class="secondary-button"
                        onclick="loadCategories()"
                    >
                        Try Again
                    </button>
                </div>
            </td>
        </tr>
    `;
}

async function parseResponse(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
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

    return date.toLocaleDateString(
        "en-NG",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function toggleMobileSidebar() {
    const sidebar =
        document.getElementById(
            "adminSidebar"
        );

    const overlay =
        document.getElementById("adminOverlay");
    const isOpen = sidebar?.classList.toggle("open");

    overlay?.classList.toggle("active", Boolean(isOpen));
}

function closeMobileSidebar() {
    document
        .getElementById("adminSidebar")
        ?.classList.remove("open");
    document
        .getElementById("adminOverlay")
        ?.classList.remove("active");
}

function clearAdminSession() {
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
}

function logout() {
    clearAdminSession();
    redirectToLogin();
}

let toastTimeout;

function showToast(message, isError = false) {
    const toast =
        document.getElementById("toast");

    const toastMessage =
        document.getElementById(
            "toastMessage"
        );

    const toastIcon =
        document.getElementById(
            "toastIcon"
        );

    if (!toast || !toastMessage) {
        return;
    }

    toastMessage.textContent =
        message;

    toast.classList.toggle(
        "error",
        isError
    );

    if (toastIcon) {
        toastIcon.textContent =
            isError ? "!" : "✓";
    }

    toast.classList.remove("hidden");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.add("hidden");
    }, 3500);
}