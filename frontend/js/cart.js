const API_BASE_URL = "http://127.0.0.1:5000/api";

const state = {
    cart: null,
    loading: false
};

const elements = {
    loading: document.getElementById("cartLoading"),
    error: document.getElementById("cartError"),
    errorMessage: document.getElementById("cartErrorMessage"),
    retry: document.getElementById("retryCart"),
    empty: document.getElementById("cartEmpty"),
    content: document.getElementById("cartContent"),
    items: document.getElementById("cartItems"),
    itemCount: document.getElementById("cartItemCount"),
    summaryQuantity: document.getElementById("summaryQuantity"),
    summarySubtotal: document.getElementById("summarySubtotal"),
    summaryTotal: document.getElementById("summaryTotal"),
    summaryText: document.getElementById("cartSummaryText"),
    clearCartButton: document.getElementById("clearCartButton"),
    checkoutButton: document.getElementById("checkoutButton"),
    cartCount: document.getElementById("cartCount"),
    currentYear: document.getElementById("currentYear"),
    accountLink: document.getElementById("accountLink"),
    mobileAccountLink: document.getElementById("mobileAccountLink"),
    searchButton: document.getElementById("searchButton"),
    searchOverlay: document.getElementById("searchOverlay"),
    searchClose: document.getElementById("searchClose"),
    closeSearch: document.getElementById("closeSearch"),
    searchInput: document.getElementById("searchInput"),
    mobileMenuButton: document.getElementById("mobileMenuButton"),
    mobileNav: document.getElementById("mobileNav")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
    updateYear();
    updateAccountLinks();
    setupEvents();

    const user = getLoggedInUser();

    if (!user) {
        redirectToSignup();
        return;
    }

    const token = getAccessToken();

    if (!token) {
        clearAuthentication();
        redirectToLogin();
        return;
    }

    await loadCart();
}

function setupEvents() {
    elements.retry?.addEventListener("click", loadCart);

    elements.clearCartButton?.addEventListener(
        "click",
        handleClearCart
    );

    elements.checkoutButton?.addEventListener(
        "click",
        handleCheckout
    );

    elements.searchButton?.addEventListener(
        "click",
        openSearch
    );

    elements.searchClose?.addEventListener(
        "click",
        closeSearch
    );

    elements.closeSearch?.addEventListener(
        "click",
        performSearch
    );

    elements.searchInput?.addEventListener(
        "keydown",
        event => {
            if (event.key === "Enter") {
                performSearch();
            }
        }
    );

    elements.searchOverlay?.addEventListener(
        "click",
        event => {
            if (event.target === elements.searchOverlay) {
                closeSearch();
            }
        }
    );

    elements.mobileMenuButton?.addEventListener(
        "click",
        toggleMobileMenu
    );
}

async function loadCart() {
    if (state.loading) {
        return;
    }

    state.loading = true;
    showLoading();

    try {
        const token = getAccessToken();

        if (!token) {
            clearAuthentication();
            redirectToLogin();
            return;
        }

        const response = await fetch(
            `${API_BASE_URL}/cart`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (response.status === 401) {
            clearAuthentication();
            redirectToLogin();
            return;
        }

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "Unable to load your cart."
            );
        }

        state.cart = data.cart;

        /*
         * Load product images/categories where
         * the cart response does not contain them.
         */
        await enrichCartItems();

        renderCart();

    } catch (error) {
        console.error("Cart loading error:", error);

        showError(
            error.message ||
            "Unable to load your cart."
        );
    } finally {
        state.loading = false;
    }
}

async function enrichCartItems() {
    if (
        !state.cart ||
        !Array.isArray(state.cart.items)
    ) {
        return;
    }

    await Promise.all(
        state.cart.items.map(async item => {
            try {
                const response = await fetch(
                    `${API_BASE_URL}/products/${item.product_id}`
                );

                if (!response.ok) {
                    return;
                }

                const data = await response.json();

                if (!data.success || !data.product) {
                    return;
                }

                const product = data.product;

                item.product_category =
                    product.category?.name ||
                    product.category_name ||
                    null;

                if (
                    Array.isArray(product.variants) &&
                    item.variant_id
                ) {
                    const matchingVariant =
                        product.variants.find(
                            variant =>
                                Number(variant.id) ===
                                Number(item.variant_id)
                        );

                    if (
                        matchingVariant &&
                        Array.isArray(matchingVariant.images)
                    ) {
                        item.variant = {
                            ...(item.variant || {}),
                            images:
                                matchingVariant.images
                        };
                    }
                }

            } catch (error) {
                console.warn(
                    `Unable to enrich product ${item.product_id}:`,
                    error
                );
            }
        })
    );
}

function renderCart() {
    const cart = state.cart;

    if (
        !cart ||
        !Array.isArray(cart.items) ||
        cart.items.length === 0
    ) {
        showEmptyCart();
        updateCartHeader(0);
        return;
    }

    elements.items.innerHTML = "";

    cart.items.forEach(item => {
        elements.items.appendChild(
            createCartItem(item)
        );
    });

    const totalQuantity =
        Number(cart.total_quantity) || 0;

    const subtotal =
        Number(cart.subtotal) || 0;

    if (elements.itemCount) {
        elements.itemCount.textContent =
            String(cart.items.length);
    }

    if (elements.summaryQuantity) {
        elements.summaryQuantity.textContent =
            String(totalQuantity);
    }

    if (elements.summarySubtotal) {
        elements.summarySubtotal.textContent =
            formatPrice(subtotal);
    }

    if (elements.summaryTotal) {
        elements.summaryTotal.textContent =
            formatPrice(subtotal);
    }

    if (elements.summaryText) {
        elements.summaryText.textContent =
            `${totalQuantity} ${
                totalQuantity === 1
                    ? "item"
                    : "items"
            } selected for your order.`;
    }

    if (elements.clearCartButton) {
        elements.clearCartButton.hidden = false;
    }

    updateCartHeader(totalQuantity);

    showContent();
}

function createCartItem(item) {
    const article =
        document.createElement("article");

    article.className = "cart-item";

    const imageUrl =
        getCartItemImage(item);

    const productId =
        item.product_id;

    const productName =
        item.product_name ||
        "Skip Fashion Product";

    const category =
        getCartItemCategory(item);

    const variant =
        item.variant || null;

    const colour =
        variant?.color ||
        variant?.color_name ||
        null;

    const optionType =
        variant?.option_type ||
        null;

    const optionValue =
        variant?.option_value ||
        null;

    const quantity =
        Number(item.quantity) || 1;

    const unitPrice =
        Number(item.unit_price) || 0;

    const totalPrice =
        Number(item.total_price) ||
        unitPrice * quantity;

    const currency =
        item.currency || "NGN";

    article.innerHTML = `
        <a
            href="../product/details.html?id=${encodeURIComponent(productId)}"
            class="cart-item-image-link"
        >
            <img
                class="cart-item-image"
                src="${escapeAttribute(imageUrl)}"
                alt="${escapeAttribute(productName)}"
            >
        </a>

        <div class="cart-item-details">

            <div class="cart-item-category">
                ${escapeHtml(category)}
            </div>

            <h3 class="cart-item-name">
                <a
                    href="../product/details.html?id=${encodeURIComponent(productId)}"
                >
                    ${escapeHtml(productName)}
                </a>
            </h3>

            <div class="cart-item-meta">

                ${
                    colour
                        ? `
                            <span>
                                Colour:
                                <strong>
                                    ${escapeHtml(colour)}
                                </strong>
                            </span>
                        `
                        : ""
                }

                ${
                    optionValue
                        ? `
                            <span>
                                ${escapeHtml(
                                    formatOptionType(
                                        optionType || "Option"
                                    )
                                )}:
                                <strong>
                                    ${escapeHtml(optionValue)}
                                </strong>
                            </span>
                        `
                        : ""
                }

            </div>

            <div class="cart-item-price">
                ${formatPrice(unitPrice, currency)}
                <span>each</span>
            </div>

        </div>

        <div class="cart-item-actions">

            <div class="cart-item-total">
                ${formatPrice(totalPrice, currency)}
            </div>

            <div class="quantity-control">

                <button
                    type="button"
                    class="quantity-button"
                    data-action="decrease"
                    aria-label="Decrease quantity"
                >
                    −
                </button>

                <input
                    type="number"
                    class="quantity-input"
                    value="${quantity}"
                    min="1"
                    max="99"
                    inputmode="numeric"
                    aria-label="Quantity"
                >

                <button
                    type="button"
                    class="quantity-button"
                    data-action="increase"
                    aria-label="Increase quantity"
                >
                    +
                </button>

            </div>

            <button
                type="button"
                class="remove-item-button"
            >
                Remove
            </button>

        </div>
    `;

    const decreaseButton =
        article.querySelector(
            '[data-action="decrease"]'
        );

    const increaseButton =
        article.querySelector(
            '[data-action="increase"]'
        );

    const quantityInput =
        article.querySelector(
            ".quantity-input"
        );

    const removeButton =
        article.querySelector(
            ".remove-item-button"
        );

    decreaseButton?.addEventListener(
        "click",
        () => {
            const currentQuantity =
                Number(quantityInput.value) || 1;

            const nextQuantity =
                Math.max(
                    1,
                    currentQuantity - 1
                );

            quantityInput.value =
                String(nextQuantity);

            updateCartItem(
                item.id,
                nextQuantity
            );
        }
    );

    increaseButton?.addEventListener(
        "click",
        () => {
            const currentQuantity =
                Number(quantityInput.value) || 1;

            const nextQuantity =
                Math.min(
                    99,
                    currentQuantity + 1
                );

            quantityInput.value =
                String(nextQuantity);

            updateCartItem(
                item.id,
                nextQuantity
            );
        }
    );

    quantityInput?.addEventListener(
        "change",
        () => {
            let nextQuantity =
                Number(quantityInput.value);

            if (
                !Number.isFinite(nextQuantity) ||
                nextQuantity < 1
            ) {
                nextQuantity = 1;
            }

            nextQuantity =
                Math.min(
                    Math.floor(nextQuantity),
                    99
                );

            quantityInput.value =
                String(nextQuantity);

            updateCartItem(
                item.id,
                nextQuantity
            );
        }
    );

    removeButton?.addEventListener(
        "click",
        () => {
            removeCartItem(item.id);
        }
    );

    return article;
}

async function updateCartItem(
    itemId,
    quantity
) {
    const token =
        getAccessToken();

    if (!token) {
        clearAuthentication();
        redirectToLogin();
        return;
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/cart/items/${itemId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization:
                            `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        quantity
                    })
                }
            );

        const data =
            await response.json();

        if (response.status === 401) {
            clearAuthentication();
            redirectToLogin();
            return;
        }

        if (
            !response.ok ||
            !data.success
        ) {
            throw new Error(
                data.message ||
                "Unable to update cart."
            );
        }

        state.cart =
            data.cart;

        await enrichCartItems();

        renderCart();

        showNotification(
            "Cart updated."
        );

    } catch (error) {
        console.error(
            "Cart update error:",
            error
        );

        showNotification(
            error.message ||
            "Unable to update cart."
        );

        await loadCart();
    }
}

async function removeCartItem(itemId) {
    const token =
        getAccessToken();

    if (!token) {
        clearAuthentication();
        redirectToLogin();
        return;
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/cart/items/${itemId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await response.json();

        if (response.status === 401) {
            clearAuthentication();
            redirectToLogin();
            return;
        }

        if (
            !response.ok ||
            !data.success
        ) {
            throw new Error(
                data.message ||
                "Unable to remove item."
            );
        }

        state.cart =
            data.cart;

        await enrichCartItems();

        renderCart();

        showNotification(
            "Item removed from your cart."
        );

    } catch (error) {
        console.error(
            "Remove cart item error:",
            error
        );

        showNotification(
            error.message ||
            "Unable to remove item."
        );
    }
}

async function handleClearCart() {
    if (
        !state.cart ||
        !Array.isArray(state.cart.items) ||
        state.cart.items.length === 0
    ) {
        return;
    }

    const confirmed =
        window.confirm(
            "Are you sure you want to clear your cart?"
        );

    if (!confirmed) {
        return;
    }

    const token =
        getAccessToken();

    if (!token) {
        clearAuthentication();
        redirectToLogin();
        return;
    }

    try {
        if (elements.clearCartButton) {
            elements.clearCartButton.disabled = true;
        }

        const response =
            await fetch(
                `${API_BASE_URL}/cart`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await response.json();

        if (response.status === 401) {
            clearAuthentication();
            redirectToLogin();
            return;
        }

        if (
            !response.ok ||
            !data.success
        ) {
            throw new Error(
                data.message ||
                "Unable to clear your cart."
            );
        }

        state.cart =
            data.cart;

        renderCart();

        showNotification(
            "Your cart has been cleared."
        );

    } catch (error) {
        console.error(
            "Clear cart error:",
            error
        );

        showNotification(
            error.message ||
            "Unable to clear your cart."
        );
    } finally {
        if (elements.clearCartButton) {
            elements.clearCartButton.disabled = false;
        }
    }
}

function handleCheckout(event) {
    if (
        !state.cart ||
        !Array.isArray(state.cart.items) ||
        state.cart.items.length === 0
    ) {
        event.preventDefault();

        showNotification(
            "Your cart is empty."
        );

        return;
    }

    const user =
        getLoggedInUser();

    const token =
        getAccessToken();

    if (!user || !token) {
        event.preventDefault();

        if (!user) {
            redirectToSignup();
        } else {
            clearAuthentication();
            redirectToLogin();
        }
    }
}

function getCartItemImage(item) {
    if (
        item.variant &&
        Array.isArray(item.variant.images) &&
        item.variant.images.length
    ) {
        const primary =
            item.variant.images.find(
                image => image.is_primary
            );

        return (
            primary?.image_url ||
            item.variant.images[0]?.image_url ||
            createPlaceholderImage(
                item.product_name
            )
        );
    }

    return createPlaceholderImage(
        item.product_name
    );
}

function getCartItemCategory(item) {
    if (item.product_category) {
        return item.product_category;
    }

    const productName =
        String(
            item.product_name || ""
        ).toLowerCase();

    if (
        productName.includes("craft") ||
        productName.includes("basket") ||
        productName.includes("bead") ||
        productName.includes("sculpt")
    ) {
        return "Handmade Crafts";
    }

    return "Skip Fashion Collection";
}

function formatOptionType(type) {
    if (!type) {
        return "Option";
    }

    const normalized =
        String(type)
            .replace(/_/g, " ")
            .trim();

    return (
        normalized.charAt(0).toUpperCase() +
        normalized.slice(1)
    );
}

function formatPrice(
    price,
    currency = "NGN"
) {
    const numericPrice =
        Number(price) || 0;

    try {
        return new Intl.NumberFormat(
            "en-NG",
            {
                style: "currency",
                currency:
                    currency || "NGN",
                maximumFractionDigits: 2
            }
        ).format(numericPrice);
    } catch (error) {
        return `${currency || "NGN"} ${numericPrice.toLocaleString()}`;
    }
}

function getLoggedInUser() {
    const user =
        localStorage.getItem("heritage_user") ||
        sessionStorage.getItem("heritage_user");

    if (!user) {
        return null;
    }

    try {
        return JSON.parse(user);
    } catch (error) {
        return null;
    }
}

function getAccessToken() {
    return (
        localStorage.getItem(
            "heritage_access_token"
        ) ||
        sessionStorage.getItem(
            "heritage_access_token"
        ) ||
        localStorage.getItem(
            "access_token"
        ) ||
        sessionStorage.getItem(
            "access_token"
        ) ||
        localStorage.getItem(
            "accessToken"
        ) ||
        sessionStorage.getItem(
            "accessToken"
        )
    );
}

function clearAuthentication() {
    const keys = [
        "heritage_user",
        "heritage_access_token",
        "heritage_refresh_token",
        "access_token",
        "accessToken"
    ];

    keys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
}

function redirectToLogin() {
    const returnUrl =
        window.location.pathname +
        window.location.search;

    sessionStorage.setItem(
        "heritageRedirect",
        returnUrl
    );

    window.location.href =
        "../auth/login.html";
}

function redirectToSignup() {
    const returnUrl =
        window.location.pathname +
        window.location.search;

    sessionStorage.setItem(
        "heritageRedirect",
        returnUrl
    );

    window.location.href =
        "../auth/signup.html";
}

function updateAccountLinks() {
    const user =
        getLoggedInUser();

    if (elements.accountLink) {
        elements.accountLink.href =
            user
                ? "../account/index.html"
                : "../auth/login.html";

        const accountLabel =
            elements.accountLink.querySelector("span");

        const label =
            user
                ? "My Account"
                : "Account";

        if (accountLabel) {
            accountLabel.textContent = label;
        } else {
            elements.accountLink.textContent = label;
        }
    }

    if (elements.mobileAccountLink) {
        elements.mobileAccountLink.href =
            user
                ? "../account/index.html"
                : "../auth/login.html";

        elements.mobileAccountLink.textContent =
            user
                ? "My Account"
                : "Account";
    }
}

function updateCartHeader(quantity) {
    if (!elements.cartCount) {
        return;
    }

    elements.cartCount.textContent =
        String(quantity);

    elements.cartCount.hidden =
        quantity <= 0;
}

function showLoading() {
    if (elements.loading) {
        elements.loading.hidden = false;
    }

    if (elements.error) {
        elements.error.hidden = true;
    }

    if (elements.empty) {
        elements.empty.hidden = true;
    }

    if (elements.content) {
        elements.content.hidden = true;
    }
}

function showContent() {
    if (elements.loading) {
        elements.loading.hidden = true;
    }

    if (elements.error) {
        elements.error.hidden = true;
    }

    if (elements.empty) {
        elements.empty.hidden = true;
    }

    if (elements.content) {
        elements.content.hidden = false;
    }
}

function showEmptyCart() {
    if (elements.loading) {
        elements.loading.hidden = true;
    }

    if (elements.error) {
        elements.error.hidden = true;
    }

    if (elements.content) {
        elements.content.hidden = true;
    }

    if (elements.empty) {
        elements.empty.hidden = false;
    }

    if (elements.clearCartButton) {
        elements.clearCartButton.hidden = true;
    }

    if (elements.summaryText) {
        elements.summaryText.textContent =
            "Your cart is currently empty.";
    }
}

function showError(message) {
    if (elements.loading) {
        elements.loading.hidden = true;
    }

    if (elements.empty) {
        elements.empty.hidden = true;
    }

    if (elements.content) {
        elements.content.hidden = true;
    }

    if (elements.error) {
        elements.error.hidden = false;
    }

    if (elements.errorMessage) {
        elements.errorMessage.textContent =
            message;
    }
}

function updateYear() {
    if (elements.currentYear) {
        elements.currentYear.textContent =
            new Date().getFullYear();
    }
}

function openSearch() {
    if (!elements.searchOverlay) {
        return;
    }

    elements.searchOverlay.hidden = false;

    requestAnimationFrame(() => {
        elements.searchOverlay.classList.add(
            "active"
        );
    });

    elements.searchInput?.focus();
}

function closeSearch() {
    if (!elements.searchOverlay) {
        return;
    }

    elements.searchOverlay.classList.remove(
        "active"
    );

    setTimeout(() => {
        elements.searchOverlay.hidden = true;
    }, 200);
}

function performSearch() {
    const query =
        elements.searchInput?.value.trim();

    if (!query) {
        return;
    }

    window.location.href =
        `../pages/shop.html?search=${encodeURIComponent(query)}`;
}

function toggleMobileMenu() {
    if (
        !elements.mobileNav ||
        !elements.mobileMenuButton
    ) {
        return;
    }

    const isOpen =
        !elements.mobileNav.hidden;

    elements.mobileNav.hidden =
        isOpen;

    elements.mobileMenuButton.setAttribute(
        "aria-expanded",
        String(!isOpen)
    );
}

function showNotification(message) {
    let notification =
        document.getElementById(
            "cartNotification"
        );

    if (!notification) {
        notification =
            document.createElement("div");

        notification.id =
            "cartNotification";

        Object.assign(
            notification.style,
            {
                position: "fixed",
                right: "20px",
                bottom: "20px",
                zIndex: "9999",
                maxWidth: "360px",
                padding: "15px 18px",
                borderRadius: "5px",
                background: "#1D1A39",
                color: "#FFFFFF",
                fontSize: "13px",
                lineHeight: "1.5",
                boxShadow:
                    "0 15px 40px rgba(29, 26, 57, 0.2)"
            }
        );

        document.body.appendChild(
            notification
        );
    }

    notification.textContent =
        message;

    notification.style.display =
        "block";

    clearTimeout(
        notification._timeout
    );

    notification._timeout =
        setTimeout(() => {
            notification.style.display =
                "none";
        }, 3500);
}

function createPlaceholderImage(
    name = "Skip Fashion Product"
) {
    const text =
        encodeURIComponent(name);

    return `
        data:image/svg+xml;charset=UTF-8,
        <svg xmlns="http://www.w3.org/2000/svg"
            width="900"
            height="1000"
            viewBox="0 0 900 1000">

            <rect
                width="900"
                height="1000"
                fill="%23F0E5E2"
            />

            <text
                x="450"
                y="480"
                text-anchor="middle"
                fill="%23662549"
                font-family="Arial"
                font-size="34"
            >${text}</text>

            <text
                x="450"
                y="530"
                text-anchor="middle"
                fill="%23766C78"
                font-family="Arial"
                font-size="20"
            >Skip Fashion Collection</text>

        </svg>
    `.replace(/\s+/g, " ");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value);
}