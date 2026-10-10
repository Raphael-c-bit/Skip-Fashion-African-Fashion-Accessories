const API_BASE_URL = "http://127.0.0.1:5000";
const ADMIN_ACCESS_TOKEN_KEY = "heritageAdminAccessToken";
const ADMIN_REFRESH_TOKEN_KEY = "heritageAdminRefreshToken";
const ADMIN_USER_KEY = "heritageAdmin";

let editingProductId = null;
let isEditMode = false;
let primaryImagePreviewUrl = null;

let productVariants = [];
let selectedImageVariantId = null;
let editingImageId = null;

document.addEventListener("DOMContentLoaded", initializeProductForm);

async function initializeProductForm() {
    setupSidebar();
    setupAlerts();
    setupProductForm();

    editingProductId = getProductIdFromUrl();
    isEditMode = Boolean(editingProductId);

    try {
        await loadAdminIdentity();
        await loadCategories();

        if (isEditMode) {
            await loadProduct();
            showManagementSections();
            await loadVariants();
            setupVariantManagement();
            setupImageManagement();
        } else {
            hideManagementSections();
            showProductForm();
        }
    } catch (error) {
        if (error.status === 401 || error.status === 403) {
            clearAdminSession();
            window.location.href = "index.html";
            return;
        }

        console.error("Product form initialization error:", error);
        showProductError(error.message || "Unable to load product form.");
    }
}

function getAccessToken() {
    return (
        localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY) ||
        sessionStorage.getItem(ADMIN_ACCESS_TOKEN_KEY)
    );
}

function accessTokenNeedsRefresh(token) {
    const payloadSegment = token?.split(".")[1];

    if (!payloadSegment) {
        return true;
    }

    try {
        const base64 = payloadSegment
            .replace(/-/g, "+")
            .replace(/_/g, "/");
        const paddedBase64 = base64.padEnd(
            Math.ceil(base64.length / 4) * 4,
            "="
        );
        const payload = JSON.parse(atob(paddedBase64));

        return !Number.isFinite(payload.exp) ||
            payload.exp <= Math.floor(Date.now() / 1000) + 30;
    } catch {
        return true;
    }
}

function clearAdminSession() {
    for (const storage of [localStorage, sessionStorage]) {
        storage.removeItem(ADMIN_USER_KEY);
        storage.removeItem(ADMIN_ACCESS_TOKEN_KEY);
        storage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
        storage.removeItem("heritageAccessToken");
        storage.removeItem("heritageRefreshToken");
    }
}

async function refreshAccessToken() {
    const refreshToken =
        localStorage.getItem(ADMIN_REFRESH_TOKEN_KEY) ||
        sessionStorage.getItem(ADMIN_REFRESH_TOKEN_KEY);

    if (!refreshToken) {
        return null;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/admin/auth/refresh`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${refreshToken}`,
                    Accept: "application/json"
                }
            }
        );

        const data = await response.json();

        if (!response.ok || !data.access_token) {
            return null;
        }

        const storage = localStorage.getItem(ADMIN_REFRESH_TOKEN_KEY)
            ? localStorage
            : sessionStorage;

        storage.setItem(ADMIN_ACCESS_TOKEN_KEY, data.access_token);
        return data.access_token;
    } catch {
        return null;
    }
}

async function apiRequest(endpoint, options = {}, hasRetried = false) {
    let token = getAccessToken();

    if (!hasRetried && accessTokenNeedsRefresh(token)) {
        token = await refreshAccessToken();
    }

    if (!token) {
        const error = new Error("You are not authenticated.");
        error.status = 401;
        throw error;
    }

    const headers = {
        ...(options.body instanceof FormData
            ? {}
            : { "Content-Type": "application/json" }),
        ...(options.headers || {})
    };

    headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (response.status === 401 && !hasRetried) {
        const refreshedToken = await refreshAccessToken();

        if (refreshedToken) {
            return apiRequest(endpoint, options, true);
        }
    }

    if (!response.ok) {
        const error = new Error(
            data.message ||
            data.error ||
            `Request failed with status ${response.status}`
        );

        error.status = response.status;
        throw error;
    }

    return data;
}

function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        return null;
    }

    const parsedId = Number(id);

    return Number.isInteger(parsedId) && parsedId > 0
        ? parsedId
        : null;
}

async function loadAdminIdentity() {
    const data = await apiRequest("/api/admin/auth/me");

    const user = data.admin || data.user || data;

    if (!user) {
        throw new Error("Unable to load administrator information.");
    }

    const name = user.name || "Administrator";
    const email = user.email || "";

    const sidebarName = document.getElementById("sidebarAdminName");
    const topbarName = document.getElementById("topbarAdminName");
    const topbarEmail = document.getElementById("topbarAdminEmail");
    const welcomeName = document.getElementById("welcomeAdminName");

    if (sidebarName) {
        sidebarName.textContent = name;
    }

    if (topbarName) {
        topbarName.textContent = name;
    }

    if (topbarEmail) {
        topbarEmail.textContent = email;
    }

    if (welcomeName) {
        welcomeName.textContent = name;
    }
}

async function loadCategories() {
    const data = await apiRequest("/api/categories");

    const categories = data.categories || data || [];
    const select = document.getElementById("productCategory");

    if (!select) {
        return;
    }

    select.innerHTML = `
        <option value="">Select category</option>
    `;

    categories.forEach(category => {
        if (category.is_active === false) {
            return;
        }

        const option = document.createElement("option");

        option.value = category.id;
        option.textContent = category.name;

        select.appendChild(option);
    });
}

async function loadProduct() {
    showProductLoading();

    const data = await apiRequest(
        `/api/products/admin/${editingProductId}`
    );

    const product = data.product || data;

    if (!product || !product.id) {
        throw new Error("Product could not be found.");
    }

    console.log("Editing product:", product);

    populateProductForm(product);

    hideProductLoading();
    showProductForm();
}

function populateProductForm(product) {
    const nameInput = document.getElementById("productName");
    const slugInput = document.getElementById("productSlug");
    const categoryInput = document.getElementById("productCategory");
    const priceInput = document.getElementById("productPrice");
    const currencyInput = document.getElementById("productCurrency");
    const typeInput = document.getElementById("productType");
    const descriptionInput = document.getElementById("productDescription");
    const activeInput = document.getElementById("productActive");
    const featuredInput = document.getElementById("productFeatured");

    if (nameInput) {
        nameInput.value = product.name || "";
    }

    if (slugInput) {
        slugInput.value = product.slug || "";
    }

    if (categoryInput) {
        categoryInput.value = product.category_id || "";
    }

    if (priceInput) {
        priceInput.value = product.price ?? "";
    }

    if (currencyInput) {
        currencyInput.value = product.currency || "NGN";
    }

    if (typeInput) {
        typeInput.value = product.product_type || "physical";
    }

    if (descriptionInput) {
        descriptionInput.value = product.description || "";
    }

    if (activeInput) {
        activeInput.checked = product.is_active !== false;
    }

    if (featuredInput) {
        featuredInput.checked = product.is_featured === true;
    }

    updatePageTitle(product.name);
}

function updatePageTitle(productName) {
    const title = document.getElementById("productFormTitle");

    if (title && isEditMode) {
        title.textContent = `Edit Product: ${productName || ""}`;
    }
}

function setupProductForm() {
    const form = document.getElementById("productForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", handleProductSubmit);

    const nameInput = document.getElementById("productName");
    const slugInput = document.getElementById("productSlug");
    const imageInput = document.getElementById("primaryProductImage");

    imageInput?.addEventListener("change", updatePrimaryImagePreview);

    if (nameInput && slugInput) {
        nameInput.addEventListener("blur", () => {
            if (!slugInput.value.trim()) {
                slugInput.value = createSlug(nameInput.value);
            }
        });
    }
}

async function handleProductSubmit(event) {
    event.preventDefault();

    clearProductMessages();

    const productName = document.getElementById("productName")?.value.trim();
    const productSlug = document.getElementById("productSlug")?.value.trim();
    const productCategory = document.getElementById("productCategory")?.value;
    const productPrice = document.getElementById("productPrice")?.value;
    const productCurrency = document.getElementById("productCurrency")?.value;
    const productType = document.getElementById("productType")?.value;
    const productDescription =
        document.getElementById("productDescription")?.value.trim();

    const productActive =
        document.getElementById("productActive")?.checked ?? true;

    const productFeatured =
        document.getElementById("productFeatured")?.checked ?? false;
    const primaryImageFile =
        document.getElementById("primaryProductImage")?.files?.[0] || null;

    if (!productName) {
        showProductError("Product name is required.");
        return;
    }

    if (!productSlug) {
        showProductError("Product slug is required.");
        return;
    }

    if (!productCategory) {
        showProductError("Please select a category.");
        return;
    }

    if (
        productPrice === "" ||
        Number.isNaN(Number(productPrice)) ||
        Number(productPrice) < 0
    ) {
        showProductError("Please enter a valid product price.");
        return;
    }

    if (!productType) {
        showProductError("Please select a product type.");
        return;
    }

    let initialVariant = null;

    if (primaryImageFile) {
        const allowedImage = /\.(jpe?g|png|webp|gif)$/i.test(
            primaryImageFile.name
        );

        if (!allowedImage) {
            showProductError("Choose a JPG, PNG, WEBP or GIF image.");
            return;
        }

        if (primaryImageFile.size > 5 * 1024 * 1024) {
            showProductError("The product image must be 5 MB or smaller.");
            return;
        }

        const optionType = document
            .getElementById("primaryImageOptionType")
            ?.value.trim();
        const optionValue = document
            .getElementById("primaryImageOptionValue")
            ?.value.trim();
        const stockValue = document
            .getElementById("primaryImageStock")
            ?.value;

        if (!optionType || !optionValue) {
            showProductError("Enter the first variant type and option for this image.");
            return;
        }

        if (stockValue === "" || !Number.isInteger(Number(stockValue)) || Number(stockValue) < 0) {
            showProductError("Starting stock must be a whole number of zero or more.");
            return;
        }

        initialVariant = {
            option_type: optionType,
            option_value: optionValue,
            stock_quantity: Number(stockValue),
            is_available: true
        };
    }

    const payload = {
        name: productName,
        slug: productSlug,
        category_id: Number(productCategory),
        price: Number(productPrice),
        currency: productCurrency || "NGN",
        product_type: productType,
        description: productDescription || "",
        is_active: productActive,
        is_featured: productFeatured
    };

    const saveButton = document.getElementById("saveProductButton");

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = isEditMode
            ? "Updating..."
            : "Creating...";
    }

    try {
        if (isEditMode) {
            await apiRequest(
                `/api/products/${editingProductId}`,
                {
                    method: "PUT",
                    body: JSON.stringify(payload)
                }
            );

            showProductSuccess("Product updated successfully.");
        } else {
            const data = await apiRequest(
                "/api/products",
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );

            const createdProduct = data.product || data.data?.product;

            if (primaryImageFile) {
                if (!createdProduct?.id) {
                    throw new Error("Product was created but its ID was not returned. Open Products and edit it to add the image.");
                }

                try {
                    const variantData = await apiRequest(
                        "/api/admin/variants",
                        {
                            method: "POST",
                            body: JSON.stringify({
                                product_id: createdProduct.id,
                                ...initialVariant
                            })
                        }
                    );

                    const variant = variantData.variant || variantData.data?.variant;

                    if (!variant?.id) {
                        throw new Error("The first variant was not returned by the server.");
                    }

                    const imagePayload = new FormData();
                    const altText = document
                        .getElementById("primaryImageAlt")
                        ?.value.trim();

                    imagePayload.append("image", primaryImageFile);
                    imagePayload.append("alt_text", altText || productName);
                    imagePayload.append("sort_order", "0");
                    imagePayload.append("is_primary", "true");

                    await apiRequest(
                        `/api/variants/${variant.id}/images`,
                        {
                            method: "POST",
                            body: imagePayload
                        }
                    );
                } catch (imageError) {
                    showProductError(
                        `Product created, but its image could not be saved: ${imageError.message} Opening Edit Product to finish setup.`
                    );

                    setTimeout(() => {
                        window.location.href =
                            `edit-product.html?id=${encodeURIComponent(createdProduct.id)}`;
                    }, 1800);

                    return;
                }
            }

            showProductSuccess(
                primaryImageFile
                    ? "Product and primary image created successfully."
                    : "Product created successfully."
            );
        }

        setTimeout(() => {
            window.location.href = "products.html";
        }, 1000);
    } catch (error) {
        console.error("Product save error:", error);
        showProductError(error.message || "Unable to save product.");
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = isEditMode
                ? "Update Product"
                : "Save Product";
        }
    }
}

function updatePrimaryImagePreview(event) {
    const file = event.target.files?.[0];
    const preview = document.getElementById("primaryImagePreview");
    const previewImage = document.getElementById("primaryImagePreviewImage");
    const variantFields = document.getElementById("primaryImageVariantFields");

    if (primaryImagePreviewUrl) {
        URL.revokeObjectURL(primaryImagePreviewUrl);
        primaryImagePreviewUrl = null;
    }

    if (!file || !preview || !previewImage || !variantFields) {
        if (preview) preview.hidden = true;
        if (variantFields) variantFields.hidden = true;
        return;
    }

    primaryImagePreviewUrl = URL.createObjectURL(file);
    previewImage.src = primaryImagePreviewUrl;
    previewImage.alt = `Preview of ${file.name}`;
    preview.hidden = false;
    variantFields.hidden = false;
}

function createSlug(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

function showManagementSections() {
    const variantsSection =
        document.getElementById("productVariantsSection");

    const imagesSection =
        document.getElementById("variantImagesSection");

    if (variantsSection) {
        variantsSection.hidden = false;
    }

    if (imagesSection) {
        imagesSection.hidden = false;
    }
}

function hideManagementSections() {
    const variantsSection =
        document.getElementById("productVariantsSection");

    const imagesSection =
        document.getElementById("variantImagesSection");

    if (variantsSection) {
        variantsSection.hidden = true;
    }

    if (imagesSection) {
        imagesSection.hidden = true;
    }
}

/* Variants */

function setupVariantManagement() {
    const addButton = document.getElementById("addVariantButton");
    const cancelButton = document.getElementById("cancelVariantButton");
    const cancelFormButton =
        document.getElementById("cancelVariantFormButton");

    const form = document.getElementById("variantForm");

    if (addButton) {
        addButton.addEventListener("click", () => {
            openVariantForm();
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener("click", closeVariantForm);
    }

    if (cancelFormButton) {
        cancelFormButton.addEventListener("click", closeVariantForm);
    }

    if (form) {
        form.addEventListener("submit", handleVariantSubmit);
    }

    const dismissButton =
        document.getElementById("dismissVariantError");

    if (dismissButton) {
        dismissButton.addEventListener("click", () => {
            hideElement("variantError");
        });
    }
}

async function loadVariants() {
    showElement("variantsLoading");
    hideElement("variantsEmpty");
    hideElement("variantsTableContainer");

    try {
        const data = await apiRequest("/api/admin/variants");

        const allVariants = Array.isArray(data.variants)
            ? data.variants
            : Array.isArray(data.data?.variants)
                ? data.data.variants
                : Array.isArray(data)
                    ? data
                    : [];
        const currentProductId = Number(editingProductId);

        productVariants = allVariants.filter(variant => {
            const variantProductId = Number(
                variant.product_id ??
                variant.productId ??
                variant.product?.id
            );

            return Number.isInteger(variantProductId) &&
                variantProductId === currentProductId;
        });

        renderVariants();
        populateImageVariantSelect();
    } catch (error) {
        console.error("Variant loading error:", error);
        showVariantError(
            error.message || "Unable to load product variants."
        );
    } finally {
        hideElement("variantsLoading");
    }
}

function renderVariants() {
    const tbody = document.getElementById("variantsTableBody");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (productVariants.length === 0) {
        showElement("variantsEmpty");
        hideElement("variantsTableContainer");
        return;
    }

    hideElement("variantsEmpty");
    showElement("variantsTableContainer");

    productVariants.forEach(variant => {
        const row = document.createElement("tr");

        const optionCell = document.createElement("td");

        optionCell.innerHTML = `
            <strong>${escapeHtml(variant.option_type || "-")}</strong>
            <div class="product-table-name">
                ${escapeHtml(variant.option_value || "-")}
            </div>
        `;

        const colourCell = document.createElement("td");

        if (variant.color_name || variant.color_code) {
            colourCell.innerHTML = `
                <div class="variant-colour">
                    ${
                        variant.color_code
                            ? `
                                <span
                                    class="variant-colour-swatch"
                                    style="background-color: ${escapeHtml(
                                        variant.color_code
                                    )};"
                                ></span>
                              `
                            : ""
                    }

                    <span>
                        ${escapeHtml(variant.color_name || "-")}
                        ${
                            variant.color_code
                                ? ` (${escapeHtml(variant.color_code)})`
                                : ""
                        }
                    </span>
                </div>
            `;
        } else {
            colourCell.textContent = "-";
        }

        const stockCell = document.createElement("td");
        stockCell.textContent = variant.stock_quantity ?? 0;

        const availabilityCell = document.createElement("td");

        const statusClass = variant.is_available
            ? "status-active"
            : "status-inactive";

        availabilityCell.innerHTML = `
            <span class="product-status ${statusClass}">
                ${variant.is_available ? "Available" : "Unavailable"}
            </span>
        `;

        const actionsCell = document.createElement("td");

        actionsCell.innerHTML = `
            <div class="product-actions variant-actions">
                <button
                    type="button"
                    class="admin-action-button"
                    data-action="edit"
                    data-id="${variant.id}"
                >
                    Edit
                </button>

                <button
                    type="button"
                    class="admin-action-button"
                    data-action="stock"
                    data-id="${variant.id}"
                >
                    Stock
                </button>

                <button
                    type="button"
                    class="admin-action-button"
                    data-action="status"
                    data-id="${variant.id}"
                >
                    ${variant.is_available ? "Disable" : "Enable"}
                </button>

                <button
                    type="button"
                    class="admin-action-button admin-danger-button"
                    data-action="delete"
                    data-id="${variant.id}"
                >
                    Delete
                </button>
            </div>
        `;

        row.appendChild(optionCell);
        row.appendChild(colourCell);
        row.appendChild(stockCell);
        row.appendChild(availabilityCell);
        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });

    tbody.querySelectorAll("[data-action]").forEach(button => {
        button.addEventListener("click", handleVariantAction);
    });
}

function openVariantForm(variant = null) {
    const container =
        document.getElementById("variantFormContainer");

    const title =
        document.getElementById("variantFormTitle");

    const idInput =
        document.getElementById("editingVariantId");

    const optionType =
        document.getElementById("variantOptionType");

    const optionValue =
        document.getElementById("variantOptionValue");

    const colorName =
        document.getElementById("variantColorName");

    const colorCode =
        document.getElementById("variantColorCode");

    const stock =
        document.getElementById("variantStock");

    const available =
        document.getElementById("variantAvailable");

    if (!container) {
        return;
    }

    if (variant) {
        title.textContent = "Edit Variant";
        idInput.value = variant.id;
        optionType.value = variant.option_type || "";
        optionValue.value = variant.option_value || "";
        colorName.value = variant.color_name || "";
        colorCode.value = variant.color_code || "";
        stock.value = variant.stock_quantity ?? 0;
        available.checked = variant.is_available !== false;
    } else {
        title.textContent = "Add Variant";
        idInput.value = "";
        optionType.value = "";
        optionValue.value = "";
        colorName.value = "";
        colorCode.value = "";
        stock.value = 0;
        available.checked = true;
    }

    showElement("variantFormContainer");
    clearVariantMessages();
}

function closeVariantForm() {
    hideElement("variantFormContainer");

    const form = document.getElementById("variantForm");

    if (form) {
        form.reset();
    }

    const stock = document.getElementById("variantStock");

    if (stock) {
        stock.value = 0;
    }

    const available = document.getElementById("variantAvailable");

    if (available) {
        available.checked = true;
    }
}

async function handleVariantSubmit(event) {
    event.preventDefault();

    clearVariantMessages();

    const editingId =
        document.getElementById("editingVariantId")?.value;

    const optionType =
        document.getElementById("variantOptionType")?.value;

    const optionValue =
        document.getElementById("variantOptionValue")?.value.trim();

    const colorName =
        document.getElementById("variantColorName")?.value.trim();

    const colorCode =
        document.getElementById("variantColorCode")?.value.trim();

    const stock =
        document.getElementById("variantStock")?.value;

    const available =
        document.getElementById("variantAvailable")?.checked ?? true;

    if (!optionType) {
        showVariantError("Please select an option type.");
        return;
    }

    if (!optionValue) {
        showVariantError("Option value is required.");
        return;
    }

    if (
        stock === "" ||
        Number.isNaN(Number(stock)) ||
        Number(stock) < 0
    ) {
        showVariantError("Please enter a valid stock quantity.");
        return;
    }

    const payload = {
        product_id: Number(editingProductId),
        option_type: optionType,
        option_value: optionValue,
        color_name: colorName || null,
        color_code: colorCode || null,
        stock_quantity: Number(stock),
        is_available: available
    };

    const saveButton =
        document.getElementById("saveVariantButton");

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = editingId
            ? "Updating..."
            : "Saving...";
    }

    try {
        if (editingId) {
            await apiRequest(
                `/api/admin/variants/${editingId}`,
                {
                    method: "PATCH",
                    body: JSON.stringify(payload)
                }
            );

            showVariantSuccess("Variant updated successfully.");
        } else {
            await apiRequest(
                "/api/admin/variants",
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );

            showVariantSuccess("Variant added successfully.");
        }

        closeVariantForm();
        await loadVariants();
    } catch (error) {
        console.error("Variant save error:", error);
        showVariantError(
            error.message || "Unable to save variant."
        );
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save Variant";
        }
    }
}

async function handleVariantAction(event) {
    const button = event.currentTarget;
    const action = button.dataset.action;
    const id = Number(button.dataset.id);

    const variant = productVariants.find(
        item => Number(item.id) === id
    );

    if (!variant) {
        return;
    }

    if (action === "edit") {
        openVariantForm(variant);
        return;
    }

    if (action === "stock") {
        await changeVariantStock(variant);
        return;
    }

    if (action === "status") {
        await toggleVariantStatus(variant);
        return;
    }

    if (action === "delete") {
        await deleteVariant(variant);
    }
}

async function changeVariantStock(variant) {
    const value = window.prompt(
        `Enter new stock quantity for ${variant.option_value}:`,
        variant.stock_quantity ?? 0
    );

    if (value === null) {
        return;
    }

    const stock = Number(value);

    if (!Number.isInteger(stock) || stock < 0) {
        showVariantError(
            "Stock quantity must be a whole number of 0 or greater."
        );
        return;
    }

    try {
        await apiRequest(
            `/api/admin/variants/${variant.id}/stock`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    stock_quantity: stock
                })
            }
        );

        showVariantSuccess("Variant stock updated successfully.");
        await loadVariants();
    } catch (error) {
        console.error("Variant stock error:", error);
        showVariantError(
            error.message || "Unable to update variant stock."
        );
    }
}

async function toggleVariantStatus(variant) {
    try {
        await apiRequest(
            `/api/admin/variants/${variant.id}/status`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    is_available: !variant.is_available
                })
            }
        );

        showVariantSuccess(
            variant.is_available
                ? "Variant disabled successfully."
                : "Variant enabled successfully."
        );

        await loadVariants();
    } catch (error) {
        console.error("Variant status error:", error);
        showVariantError(
            error.message || "Unable to update variant availability."
        );
    }
}

async function deleteVariant(variant) {
    const confirmed = window.confirm(
        `Delete the ${variant.option_value} variant?`
    );

    if (!confirmed) {
        return;
    }

    try {
        await apiRequest(
            `/api/admin/variants/${variant.id}`,
            {
                method: "DELETE"
            }
        );

        if (
            Number(selectedImageVariantId) ===
            Number(variant.id)
        ) {
            selectedImageVariantId = null;

            const select =
                document.getElementById("imageVariantSelect");

            if (select) {
                select.value = "";
            }

            resetImageArea();
        }

        showVariantSuccess("Variant deleted successfully.");
        await loadVariants();
    } catch (error) {
        console.error("Variant delete error:", error);
        showVariantError(
            error.message || "Unable to delete variant."
        );
    }
}

/* Images */

function setupImageManagement() {
    const variantSelect =
        document.getElementById("imageVariantSelect");

    const addImageButton =
        document.getElementById("addImageButton");

    const cancelImageButton =
        document.getElementById("cancelImageButton");

    const cancelImageFormButton =
        document.getElementById("cancelImageFormButton");

    const imageForm =
        document.getElementById("imageForm");

    const dismissImageError =
        document.getElementById("dismissImageError");

    if (variantSelect) {
        variantSelect.addEventListener(
            "change",
            handleImageVariantChange
        );
    }

    if (addImageButton) {
        addImageButton.addEventListener("click", () => {
            openImageForm();
        });
    }

    if (cancelImageButton) {
        cancelImageButton.addEventListener(
            "click",
            closeImageForm
        );
    }

    if (cancelImageFormButton) {
        cancelImageFormButton.addEventListener(
            "click",
            closeImageForm
        );
    }

    if (imageForm) {
        imageForm.addEventListener(
            "submit",
            handleImageSubmit
        );
    }

    if (dismissImageError) {
        dismissImageError.addEventListener("click", () => {
            hideElement("imageError");
        });
    }
}

function populateImageVariantSelect() {
    const select =
        document.getElementById("imageVariantSelect");

    if (!select) {
        return;
    }

    const currentValue = select.value;

    select.innerHTML = `
        <option value="">Select a variant</option>
    `;

    productVariants.forEach(variant => {
        const option = document.createElement("option");

        option.value = variant.id;

        option.textContent =
            `${variant.option_type || "Option"}: ` +
            `${variant.option_value || "-"}` +
            (
                variant.color_name
                    ? ` - ${variant.color_name}`
                    : ""
            );

        select.appendChild(option);
    });

    if (
        currentValue &&
        productVariants.some(
            variant => String(variant.id) === currentValue
        )
    ) {
        select.value = currentValue;
    }
}

async function handleImageVariantChange(event) {
    selectedImageVariantId = Number(event.target.value) || null;

    closeImageForm();

    if (!selectedImageVariantId) {
        resetImageArea();
        return;
    }

    await loadImagesForVariant(selectedImageVariantId);
}

async function loadImagesForVariant(variantId) {
    showElement("imagesLoading");
    hideElement("imagesEmpty");
    hideElement("imagesGrid");

    try {
        const data = await apiRequest(
            `/api/variants/${variantId}/images`
        );

        const images = data.images || data || [];

        renderImages(images);
    } catch (error) {
        console.error("Image loading error:", error);

        showImageError(
            error.message || "Unable to load variant images."
        );

        hideElement("imagesLoading");
    }
}

function renderImages(images) {
    const grid = document.getElementById("imagesGrid");

    if (!grid) {
        return;
    }

    grid.innerHTML = "";
    hideElement("imagesLoading");

    const addButton =
        document.getElementById("addImageButton");

    if (addButton) {
        addButton.disabled = !selectedImageVariantId;
    }

    if (!images.length) {
        showElement("imagesEmpty");
        hideElement("imagesGrid");
        return;
    }

    hideElement("imagesEmpty");
    showElement("imagesGrid");

    images.forEach(image => {
        const card = document.createElement("div");

        card.className = "variant-image-card";

        card.innerHTML = `
            <div class="variant-image-preview">
                <img
                    src="${escapeHtml(image.image_url)}"
                    alt="${escapeHtml(
                        image.alt_text || "Product image"
                    )}"
                    loading="lazy"
                    onerror="this.parentElement.classList.add('image-load-error')"
                >
            </div>

            <div class="variant-image-info">
                <div class="variant-image-title">
                    ${
                        image.is_primary
                            ? `
                                <span class="product-status status-active">
                                    Primary
                                </span>
                              `
                            : ""
                    }
                </div>

                <p>
                    ${escapeHtml(
                        image.alt_text || "No alt text"
                    )}
                </p>

                <small>
                    Sort order: ${image.sort_order ?? 0}
                </small>
            </div>

            <div class="variant-image-actions">
                <button
                    type="button"
                    class="admin-action-button"
                    data-image-action="edit"
                    data-id="${image.id}"
                >
                    Edit
                </button>

                ${
                    image.is_primary
                        ? ""
                        : `
                            <button
                                type="button"
                                class="admin-action-button"
                                data-image-action="primary"
                                data-id="${image.id}"
                            >
                                Set Primary
                            </button>
                          `
                }

                <button
                    type="button"
                    class="admin-action-button admin-danger-button"
                    data-image-action="delete"
                    data-id="${image.id}"
                >
                    Delete
                </button>
            </div>
        `;

        grid.appendChild(card);
    });

    grid.querySelectorAll("[data-image-action]").forEach(
        button => {
            button.addEventListener(
                "click",
                handleImageAction
            );
        }
    );
}

function resetImageArea() {
    selectedImageVariantId = null;

    hideElement("imagesLoading");
    hideElement("imagesGrid");
    hideElement("imageFormContainer");

    const addButton =
        document.getElementById("addImageButton");

    if (addButton) {
        addButton.disabled = true;
    }

    showElement("imagesEmpty");

    const empty = document.getElementById("imagesEmpty");

    if (empty) {
        empty.textContent =
            "Select a variant to manage its images.";
    }
}

function openImageForm(image = null) {
    if (!selectedImageVariantId) {
        showImageError("Please select a variant first.");
        return;
    }

    const container =
        document.getElementById("imageFormContainer");

    const title =
        document.getElementById("imageFormTitle");

    const idInput =
        document.getElementById("editingImageId");

    const fileInput =
        document.getElementById("imageFile");

    const altInput =
        document.getElementById("imageAltText");

    const sortInput =
        document.getElementById("imageSortOrder");

    const primaryInput =
        document.getElementById("imageIsPrimary");

    editingImageId = image ? image.id : null;

    if (image) {
        title.textContent = "Edit Image";
        idInput.value = image.id;
        fileInput.value = "";
        fileInput.required = false;
        altInput.value = image.alt_text || "";
        sortInput.value = image.sort_order ?? 0;
        primaryInput.checked = image.is_primary === true;
    } else {
        title.textContent = "Add Image";
        idInput.value = "";
        fileInput.value = "";
        fileInput.required = true;
        altInput.value = "";
        sortInput.value = 0;
        primaryInput.checked = false;
    }

    showElement("imageFormContainer");
    clearImageMessages();
}

function closeImageForm() {
    hideElement("imageFormContainer");

    editingImageId = null;

    const form = document.getElementById("imageForm");

    if (form) {
        form.reset();
    }

    const sortInput =
        document.getElementById("imageSortOrder");

    if (sortInput) {
        sortInput.value = 0;
    }
}

async function handleImageSubmit(event) {
    event.preventDefault();

    clearImageMessages();

    if (!selectedImageVariantId) {
        showImageError("Please select a variant first.");
        return;
    }

    const fileInput =
        document.getElementById("imageFile");

    const imageFile = fileInput?.files?.[0];

    const altText =
        document.getElementById("imageAltText")?.value.trim();

    const sortOrder =
        document.getElementById("imageSortOrder")?.value;

    const isPrimary =
        document.getElementById("imageIsPrimary")?.checked ??
        false;

    if (!editingImageId && !imageFile) {
        showImageError("Please choose an image file to upload.");
        return;
    }

    const payload = new FormData();

    if (imageFile) {
        payload.append("image", imageFile);
    }

    payload.append("alt_text", altText || "");
    payload.append("sort_order", String(Number(sortOrder) || 0));
    payload.append("is_primary", String(isPrimary));

    const saveButton =
        document.getElementById("saveImageButton");

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = editingImageId
            ? "Updating..."
            : "Saving...";
    }

    try {
        if (editingImageId) {
            await apiRequest(
                `/api/images/${editingImageId}`,
                {
                    method: "PUT",
                    body: payload
                }
            );

            showImageSuccess("Image updated successfully.");
        } else {
            await apiRequest(
                `/api/variants/${selectedImageVariantId}/images`,
                {
                    method: "POST",
                    body: payload
                }
            );

            showImageSuccess("Image added successfully.");
        }

        closeImageForm();

        await loadImagesForVariant(
            selectedImageVariantId
        );
    } catch (error) {
        console.error("Image save error:", error);

        showImageError(
            error.message || "Unable to save image."
        );
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save Image";
        }
    }
}

async function handleImageAction(event) {
    const button = event.currentTarget;

    const action = button.dataset.imageAction;
    const id = Number(button.dataset.id);

    if (!id) {
        return;
    }

    if (action === "edit") {
        await editImage(id);
        return;
    }

    if (action === "primary") {
        await setPrimaryImage(id);
        return;
    }

    if (action === "delete") {
        await deleteImage(id);
    }
}

async function editImage(imageId) {
    try {
        const data = await apiRequest(
            `/api/images/${imageId}`
        );

        const image = data.image || data;

        if (!image) {
            throw new Error("Image could not be found.");
        }

        openImageForm(image);
    } catch (error) {
        console.error("Image loading error:", error);

        showImageError(
            error.message || "Unable to load image."
        );
    }
}

async function setPrimaryImage(imageId) {
    try {
        await apiRequest(
            `/api/images/${imageId}`,
            {
                method: "PUT",
                body: JSON.stringify({
                    is_primary: true
                })
            }
        );

        showImageSuccess(
            "Image set as primary successfully."
        );

        await loadImagesForVariant(
            selectedImageVariantId
        );
    } catch (error) {
        console.error("Primary image error:", error);

        showImageError(
            error.message || "Unable to set primary image."
        );
    }
}

async function deleteImage(imageId) {
    const confirmed = window.confirm(
        "Delete this product image?"
    );

    if (!confirmed) {
        return;
    }

    try {
        await apiRequest(
            `/api/images/${imageId}`,
            {
                method: "DELETE"
            }
        );

        showImageSuccess("Image deleted successfully.");

        await loadImagesForVariant(
            selectedImageVariantId
        );
    } catch (error) {
        console.error("Image delete error:", error);

        showImageError(
            error.message || "Unable to delete image."
        );
    }
}

/* Alerts */

function setupAlerts() {
    const dismissProductError =
        document.getElementById("dismissProductError");

    if (dismissProductError) {
        dismissProductError.addEventListener("click", () => {
            hideElement("productFormError");
        });
    }
}

function clearProductMessages() {
    hideElement("productFormError");
    hideElement("productFormSuccess");
}

function showProductError(message) {
    const element = document.getElementById("productFormError");
    const messageElement =
        document.getElementById("productFormErrorMessage");

    if (messageElement) {
        messageElement.textContent = message;
    }

    if (element) {
        element.hidden = false;
    }
}

function showProductSuccess(message) {
    const element =
        document.getElementById("productFormSuccess");

    const messageElement =
        document.getElementById("productFormSuccessMessage");

    if (messageElement) {
        messageElement.textContent = message;
    }

    if (element) {
        element.hidden = false;
    }
}

function clearVariantMessages() {
    hideElement("variantError");
    hideElement("variantSuccess");
}

function showVariantError(message) {
    const element =
        document.getElementById("variantError");

    const messageElement =
        document.getElementById("variantErrorMessage");

    if (messageElement) {
        messageElement.textContent = message;
    }

    if (element) {
        element.hidden = false;
    }
}

function showVariantSuccess(message) {
    const element =
        document.getElementById("variantSuccess");

    const messageElement =
        document.getElementById("variantSuccessMessage");

    if (messageElement) {
        messageElement.textContent = message;
    }

    if (element) {
        element.hidden = false;
    }
}

function clearImageMessages() {
    hideElement("imageError");
    hideElement("imageSuccess");
}

function showImageError(message) {
    const element =
        document.getElementById("imageError");

    const messageElement =
        document.getElementById("imageErrorMessage");

    if (messageElement) {
        messageElement.textContent = message;
    }

    if (element) {
        element.hidden = false;
    }
}

function showImageSuccess(message) {
    const element =
        document.getElementById("imageSuccess");

    const messageElement =
        document.getElementById("imageSuccessMessage");

    if (messageElement) {
        messageElement.textContent = message;
    }

    if (element) {
        messageElement.textContent = message;
    }

    if (element) {
        element.hidden = false;
    }
}

/* Loading */

function showProductLoading() {
    showElement("productFormLoading");
    hideElement("productForm");
}

function hideProductLoading() {
    hideElement("productFormLoading");
}

function showProductForm() {
    showElement("productForm");
}

function hideElement(id) {
    const element = document.getElementById(id);

    if (element) {
        element.hidden = true;
    }
}

function showElement(id) {
    const element = document.getElementById(id);

    if (element) {
        element.hidden = false;
    }
}

function escapeHtml(value) {
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}

/* Sidebar */

function setupSidebar() {
    const sidebar =
        document.getElementById("adminSidebar");

    const overlay =
        document.getElementById("adminOverlay");

    const toggle =
        document.getElementById("sidebarToggle");

    const close =
        document.getElementById("sidebarClose");

    const logout =
        document.getElementById("logoutButton");

    if (toggle) {
        toggle.addEventListener("click", () => {
            sidebar?.classList.add("open");
            overlay?.classList.add("active");
        });
    }

    if (close) {
        close.addEventListener("click", closeSidebar);
    }

    if (overlay) {
        overlay.addEventListener("click", closeSidebar);
    }

    if (logout) {
        logout.addEventListener("click", () => {
            clearAdminSession();
            window.location.href = "index.html";
        });
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