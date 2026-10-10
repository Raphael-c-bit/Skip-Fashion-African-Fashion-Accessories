const API_BASE_URL = "http://127.0.0.1:5000/api";
const OWNER_WHATSAPP = "2349164836936";

const STORAGE_KEYS = {
    user: "heritage_user",
    accessToken: "heritage_access_token",
    refreshToken: "heritage_refresh_token"
};

const state = {
    product: null,
    products: [],
    images: [],
    currentImageIndex: 0,
    selectedColour: null,
    selectedOption: null,
    quantity: 1
};

const elements = {
    loading: document.getElementById("productLoading"),
    error: document.getElementById("productError"),
    errorMessage: document.getElementById("productErrorMessage"),
    retry: document.getElementById("retryProduct"),
    content: document.getElementById("productContent"),
    breadcrumbProduct: document.getElementById("breadcrumbProduct"),
    productName: document.getElementById("productName"),
    productCategory: document.getElementById("productCategory"),
    productPrice: document.getElementById("productPrice"),
    productDescription: document.getElementById("productDescription"),
    mainImage: document.getElementById("mainProductImage"),
    thumbnails: document.getElementById("productThumbnails"),
    galleryPrev: document.getElementById("galleryPrev"),
    galleryNext: document.getElementById("galleryNext"),
    featuredBadge: document.getElementById("featuredBadge"),
    colourSection: document.getElementById("colourSection"),
    colourOptions: document.getElementById("colourOptions"),
    selectedColourLabel: document.getElementById("selectedColourLabel"),
    optionSection: document.getElementById("optionSection"),
    optionTypeLabel: document.getElementById("optionTypeLabel"),
    optionOptions: document.getElementById("optionOptions"),
    selectedOptionLabel: document.getElementById("selectedOptionLabel"),
    stockStatus: document.getElementById("stockStatus"),
    stockStatusText: document.getElementById("stockStatusText"),
    quantityInput: document.getElementById("quantityInput"),
    quantityDecrease: document.getElementById("quantityDecrease"),
    quantityIncrease: document.getElementById("quantityIncrease"),
    addToCart: document.getElementById("addToCart"),
    whatsappOrder: document.getElementById("whatsappOrder"),
    infoCategory: document.getElementById("infoCategory"),
    productCode: document.getElementById("productCode"),
    relatedSection: document.getElementById("relatedSection"),
    relatedProducts: document.getElementById("relatedProducts"),
    currentYear: document.getElementById("currentYear"),
    accountLink: document.getElementById("accountLink"),
    searchButton: document.getElementById("searchButton"),
    searchToggle: document.getElementById("searchToggle"),
    searchPanel: document.getElementById("searchPanel"),
    searchOverlay: document.getElementById("searchOverlay"),
    searchClose: document.getElementById("searchClose"),
    closeSearch: document.getElementById("closeSearch"),
    globalSearch: document.getElementById("globalSearch"),
    searchInput: document.getElementById("searchInput")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
    updateYear();
    updateAccountLink();
    setupEvents();

    const productId = getProductId();

    if (!productId) {
        showError(
            "No product was specified. Please return to the Shop."
        );
        return;
    }

    await loadProduct(productId);
}

function setupEvents() {
    elements.retry?.addEventListener("click", () => {
        const productId = getProductId();

        if (productId) {
            loadProduct(productId);
        }
    });

    elements.galleryPrev?.addEventListener(
        "click",
        showPreviousImage
    );

    elements.galleryNext?.addEventListener(
        "click",
        showNextImage
    );

    elements.quantityDecrease?.addEventListener(
        "click",
        decreaseQuantity
    );

    elements.quantityIncrease?.addEventListener(
        "click",
        increaseQuantity
    );

    elements.quantityInput?.addEventListener(
        "change",
        handleQuantityInput
    );

    elements.addToCart?.addEventListener(
        "click",
        handleAddToCart
    );

    elements.whatsappOrder?.addEventListener(
        "click",
        handleWhatsAppOrder
    );

    const searchTrigger =
        elements.searchButton ||
        elements.searchToggle;

    const closeButton =
        elements.searchClose ||
        elements.closeSearch;

    const searchField =
        elements.searchInput ||
        elements.globalSearch;

    const searchPanel =
        elements.searchPanel ||
        elements.searchOverlay;

    searchTrigger?.addEventListener(
        "click",
        openSearch
    );

    closeButton?.addEventListener(
        "click",
        closeSearch
    );

    searchField?.addEventListener(
        "keydown",
        event => {
            if (event.key !== "Enter") {
                return;
            }

            const search =
                searchField.value.trim();

            if (search) {
                window.location.href =
                    `../pages/shop.html?search=${encodeURIComponent(
                        search
                    )}`;
            }
        }
    );

    searchPanel?.addEventListener(
        "click",
        event => {
            if (event.target === searchPanel) {
                closeSearch();
            }
        }
    );
}

function getProductId() {
    const params =
        new URLSearchParams(
            window.location.search
        );

    return params.get("id");
}

async function loadProduct(productId) {
    showLoading();

    try {
        const response = await fetch(
            `${API_BASE_URL}/products/${encodeURIComponent(
                productId
            )}`
        );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success ||
            !data.product
        ) {
            throw new Error(
                data.message ||
                "Product could not be loaded."
            );
        }

        state.product = data.product;
        state.products = [];

        prepareProduct();
        renderProduct();

        await loadRelatedProducts();

        showContent();
    } catch (error) {
        console.error(
            "Product loading error:",
            error
        );

        showError(
            error.message ||
            "Unable to load this product."
        );
    }
}

function prepareProduct() {
    const product = state.product;

    state.selectedColour = null;
    state.selectedOption = null;
    state.quantity = 1;

    if (elements.quantityInput) {
        elements.quantityInput.value = "1";
        elements.quantityInput.max = "99";
    }

    state.images =
        collectProductImages(product);

    const colours =
        getColours(product);

    if (colours.length === 1) {
        state.selectedColour =
            colours[0];
    }

    const options =
        getOptions(product);

    if (options.length === 1) {
        const onlyOption =
            options[0];

        const availableForColour =
            getMatchingVariants(
                state.selectedColour,
                onlyOption
            ).some(
                isVariantAvailable
            );

        if (availableForColour) {
            state.selectedOption =
                onlyOption;
        }
    }

    state.currentImageIndex = 0;
}

function renderProduct() {
    const product = state.product;

    elements.productName.textContent =
        product.name || "Product";

    elements.breadcrumbProduct.textContent =
        product.name || "Product";

    const category =
        getProductCategory(product);

    elements.productCategory.textContent =
        category;

    elements.infoCategory.textContent =
        category;

    elements.productPrice.textContent =
        formatPrice(
            product.price,
            product.currency
        );

    elements.productDescription.innerHTML =
        "";

    const description =
        document.createElement("p");

    description.textContent =
        product.description ||
        "More details about this product will be available soon.";

    elements.productDescription.appendChild(
        description
    );

    elements.productCode.textContent =
        product.slug ||
        `#${product.id}`;

    elements.featuredBadge.hidden =
        !product.is_featured;

    renderGallery();
    renderColours();
    renderOptions();
    updateSelectionState();
}

function collectProductImages(product) {
    const images = [];

    (product.variants || []).forEach(
        variant => {
            (variant.images || []).forEach(
                image => {
                    if (!image.image_url) {
                        return;
                    }

                    images.push({
                        ...image,
                        variantId: variant.id,
                        colorName:
                            variant.color_name,
                        optionValue:
                            variant.option_value
                    });
                }
            );
        }
    );

    images.sort((a, b) => {
        if (
            a.is_primary &&
            !b.is_primary
        ) {
            return -1;
        }

        if (
            !a.is_primary &&
            b.is_primary
        ) {
            return 1;
        }

        return (
            (a.sort_order || 0) -
            (b.sort_order || 0)
        );
    });

    return images;
}

function getImagesForColour(colour) {
    if (!colour) {
        return state.images;
    }

    const filtered =
        state.images.filter(image => {
            return (
                image.colorName &&
                image.colorName.toLowerCase() ===
                    colour.name.toLowerCase()
            );
        });

    return filtered.length
        ? filtered
        : state.images;
}

function renderGallery() {
    const images =
        getImagesForColour(
            state.selectedColour
        );

    if (!images.length) {
        elements.mainImage.src =
            createPlaceholderImage(
                state.product.name
            );

        elements.mainImage.alt =
            state.product.name ||
            "Product image";

        elements.thumbnails.innerHTML =
            "";

        elements.galleryPrev.hidden =
            true;

        elements.galleryNext.hidden =
            true;

        return;
    }

    if (
        state.currentImageIndex >=
        images.length
    ) {
        state.currentImageIndex = 0;
    }

    elements.galleryPrev.hidden =
        images.length <= 1;

    elements.galleryNext.hidden =
        images.length <= 1;

    elements.thumbnails.innerHTML =
        "";

    images.forEach(
        (image, index) => {
            const button =
                document.createElement(
                    "button"
                );

            button.type = "button";
            button.className =
                "product-thumbnail";

            button.classList.toggle(
                "active",
                index ===
                    state.currentImageIndex
            );

            const imageElement =
                document.createElement(
                    "img"
                );

            imageElement.src =
                image.image_url;

            imageElement.alt =
                image.alt_text ||
                state.product.name ||
                "Product image";

            button.appendChild(
                imageElement
            );

            button.addEventListener(
                "click",
                () => {
                    state.currentImageIndex =
                        index;

                    updateMainImage();
                }
            );

            elements.thumbnails.appendChild(
                button
            );
        }
    );

    updateMainImage();
}

function updateMainImage() {
    const images =
        getImagesForColour(
            state.selectedColour
        );

    if (!images.length) {
        return;
    }

    if (
        state.currentImageIndex >=
        images.length
    ) {
        state.currentImageIndex = 0;
    }

    const image =
        images[
            state.currentImageIndex
        ];

    elements.mainImage.src =
        image.image_url;

    elements.mainImage.alt =
        image.alt_text ||
        state.product.name ||
        "Product image";

    document
        .querySelectorAll(
            ".product-thumbnail"
        )
        .forEach(
            (thumbnail, index) => {
                thumbnail.classList.toggle(
                    "active",
                    index ===
                        state.currentImageIndex
                );
            }
        );
}

function showPreviousImage() {
    const images =
        getImagesForColour(
            state.selectedColour
        );

    if (images.length <= 1) {
        return;
    }

    state.currentImageIndex =
        (
            state.currentImageIndex -
            1 +
            images.length
        ) %
        images.length;

    renderGallery();
}

function showNextImage() {
    const images =
        getImagesForColour(
            state.selectedColour
        );

    if (images.length <= 1) {
        return;
    }

    state.currentImageIndex =
        (
            state.currentImageIndex +
            1
        ) %
        images.length;

    renderGallery();
}

function getColours(product) {
    const colours = [];

    (product.variants || []).forEach(
        variant => {
            if (!variant.color_name) {
                return;
            }

            const exists =
                colours.some(
                    colour =>
                        colour.name.toLowerCase() ===
                        variant.color_name.toLowerCase()
                );

            if (!exists) {
                colours.push({
                    name:
                        variant.color_name,
                    code:
                        variant.color_code ||
                        "#662549"
                });
            }
        }
    );

    return colours;
}

function getOptions(product) {
    const options = [];

    (product.variants || []).forEach(
        variant => {
            if (!variant.option_value) {
                return;
            }

            const type =
                variant.option_type ||
                "Option";

            const exists =
                options.some(option => {
                    return (
                        option.type.toLowerCase() ===
                            type.toLowerCase() &&
                        option.value.toLowerCase() ===
                            variant.option_value.toLowerCase()
                    );
                });

            if (!exists) {
                options.push({
                    type,
                    value:
                        variant.option_value
                });
            }
        }
    );

    return options;
}

function renderColours() {
    const colours =
        getColours(state.product);

    elements.colourOptions.innerHTML =
        "";

    if (!colours.length) {
        elements.colourSection.hidden =
            true;

        return;
    }

    elements.colourSection.hidden =
        false;

    colours.forEach(
        colour => {
            const button =
                document.createElement(
                    "button"
                );

            button.type = "button";
            button.className =
                "colour-option";

            button.title =
                colour.name;

            button.setAttribute(
                "aria-label",
                colour.name
            );

            if (
                state.selectedColour &&
                state.selectedColour.name.toLowerCase() ===
                    colour.name.toLowerCase()
            ) {
                button.classList.add(
                    "active"
                );
            }

            const colourCircle =
                document.createElement(
                    "span"
                );

            colourCircle.style.background =
                colour.code;

            button.appendChild(
                colourCircle
            );

            button.addEventListener(
                "click",
                () => {
                    state.selectedColour =
                        colour;

                    if (
                        state.selectedOption
                    ) {
                        const matchingVariant =
                            getMatchingVariants(
                                colour,
                                state.selectedOption
                            ).some(
                                isVariantAvailable
                            );

                        if (!matchingVariant) {
                            state.selectedOption =
                                null;
                        }
                    }

                    state.currentImageIndex =
                        0;

                    renderGallery();
                    updateSelectionState();
                }
            );

            elements.colourOptions.appendChild(
                button
            );
        }
    );

    elements.selectedColourLabel.textContent =
        state.selectedColour?.name ||
        "Select a colour";
}

function renderOptions() {
    const options =
        getOptions(state.product);

    elements.optionOptions.innerHTML =
        "";

    if (!options.length) {
        elements.optionSection.hidden =
            true;

        return;
    }

    elements.optionSection.hidden =
        false;

    const firstType =
        options[0].type ||
        "Option";

    elements.optionTypeLabel.textContent =
        formatOptionType(
            firstType
        );

    options.forEach(
        option => {
            const button =
                document.createElement(
                    "button"
                );

            button.type = "button";
            button.className =
                "option-button";

            button.textContent =
                option.value;

            if (
                state.selectedOption &&
                state.selectedOption.value.toLowerCase() ===
                    option.value.toLowerCase() &&
                state.selectedOption.type.toLowerCase() ===
                    option.type.toLowerCase()
            ) {
                button.classList.add(
                    "active"
                );
            }

            const available =
                getMatchingVariants(
                    state.selectedColour,
                    option
                ).some(
                    isVariantAvailable
                );

            if (!available) {
                button.classList.add(
                    "disabled"
                );

                button.disabled = true;
            }

            button.addEventListener(
                "click",
                () => {
                    if (!available) {
                        return;
                    }

                    state.selectedOption =
                        option;

                    updateSelectionState();
                }
            );

            elements.optionOptions.appendChild(
                button
            );
        }
    );

    elements.selectedOptionLabel.textContent =
        state.selectedOption?.value ||
        "Select an option";
}

function updateSelectionState() {
    renderColours();
    renderOptions();

    const variant =
        getSelectedVariant();

    if (!variant) {
        elements.stockStatus.className =
            "stock-status";

        elements.stockStatusText.textContent =
            "Select your available options";

        elements.addToCart.disabled =
            true;

        elements.whatsappOrder.disabled =
            true;

        return;
    }

    if (isVariantAvailable(variant)) {
        elements.stockStatus.className =
            "stock-status in-stock";

        if (variant.stock_quantity > 0) {
            elements.stockStatusText.textContent =
                `${variant.stock_quantity} available`;
        } else {
            elements.stockStatusText.textContent =
                "Available";
        }

        elements.addToCart.disabled =
            false;

        elements.whatsappOrder.disabled =
            false;

        const maxQuantity =
            variant.stock_quantity > 0
                ? Math.min(
                    variant.stock_quantity,
                    99
                )
                : 99;

        elements.quantityInput.max =
            String(maxQuantity);

        if (
            state.quantity >
            maxQuantity
        ) {
            state.quantity =
                maxQuantity;

            elements.quantityInput.value =
                String(maxQuantity);
        }
    } else {
        elements.stockStatus.className =
            "stock-status out-of-stock";

        elements.stockStatusText.textContent =
            "Currently unavailable";

        elements.addToCart.disabled =
            true;

        elements.whatsappOrder.disabled =
            true;
    }
}

function getSelectedVariant() {
    const variants =
        state.product?.variants || [];

    if (!variants.length) {
        return null;
    }

    let matches = variants;

    if (state.selectedColour) {
        matches =
            matches.filter(
                variant => {
                    return (
                        variant.color_name &&
                        variant.color_name.toLowerCase() ===
                            state.selectedColour.name.toLowerCase()
                    );
                }
            );
    }

    if (state.selectedOption) {
        matches =
            matches.filter(
                variant => {
                    return (
                        variant.option_value &&
                        variant.option_value.toLowerCase() ===
                            state.selectedOption.value.toLowerCase()
                    );
                }
            );
    }

    return matches[0] || null;
}

function getMatchingVariants(
    colour,
    option
) {
    return (
        state.product?.variants || []
    ).filter(variant => {
        const colourMatches =
            !colour ||
            (
                variant.color_name &&
                variant.color_name.toLowerCase() ===
                    colour.name.toLowerCase()
            );

        const optionMatches =
            !option ||
            (
                variant.option_value &&
                variant.option_value.toLowerCase() ===
                    option.value.toLowerCase()
            );

        return (
            colourMatches &&
            optionMatches
        );
    });
}

function isVariantAvailable(
    variant
) {
    if (!variant) {
        return false;
    }

    if (!variant.is_available) {
        return false;
    }

    if (
        variant.stock_quantity !==
            undefined &&
        variant.stock_quantity !==
            null &&
        variant.stock_quantity <= 0
    ) {
        return false;
    }

    return true;
}

function increaseQuantity() {
    const variant =
        getSelectedVariant();

    const max =
        variant &&
        variant.stock_quantity > 0
            ? Math.min(
                variant.stock_quantity,
                99
            )
            : 99;

    if (state.quantity < max) {
        state.quantity += 1;

        elements.quantityInput.value =
            String(state.quantity);
    }
}

function decreaseQuantity() {
    if (state.quantity <= 1) {
        return;
    }

    state.quantity -= 1;

    elements.quantityInput.value =
        String(state.quantity);
}

function handleQuantityInput() {
    const variant =
        getSelectedVariant();

    let max = 99;

    if (
        variant &&
        variant.stock_quantity > 0
    ) {
        max = Math.min(
            variant.stock_quantity,
            99
        );
    }

    let quantity =
        Number(
            elements.quantityInput.value
        );

    if (
        !Number.isFinite(quantity) ||
        quantity < 1
    ) {
        quantity = 1;
    }

    quantity =
        Math.floor(quantity);

    quantity =
        Math.min(
            quantity,
            max
        );

    state.quantity =
        quantity;

    elements.quantityInput.value =
        String(quantity);
}

/* ================================
   AUTHENTICATION
================================ */

function getLoggedInUser() {
    const localUser =
        localStorage.getItem(
            STORAGE_KEYS.user
        );

    const sessionUser =
        sessionStorage.getItem(
            STORAGE_KEYS.user
        );

    const storedUser =
        localUser || sessionUser;

    if (!storedUser) {
        return null;
    }

    try {
        return JSON.parse(
            storedUser
        );
    } catch (error) {
        console.error(
            "Invalid stored user:",
            error
        );

        return null;
    }
}

function getAccessToken() {
    const localToken =
        localStorage.getItem(
            STORAGE_KEYS.accessToken
        );

    const sessionToken =
        sessionStorage.getItem(
            STORAGE_KEYS.accessToken
        );

    return (
        localToken ||
        sessionToken ||
        null
    );
}

function getRefreshToken() {
    const localToken =
        localStorage.getItem(
            STORAGE_KEYS.refreshToken
        );

    const sessionToken =
        sessionStorage.getItem(
            STORAGE_KEYS.refreshToken
        );

    return (
        localToken ||
        sessionToken ||
        null
    );
}

function storeAccessToken(
    accessToken
) {
    const useLocalStorage =
        Boolean(
            localStorage.getItem(
                STORAGE_KEYS.user
            )
        );

    if (useLocalStorage) {
        localStorage.setItem(
            STORAGE_KEYS.accessToken,
            accessToken
        );
    } else {
        sessionStorage.setItem(
            STORAGE_KEYS.accessToken,
            accessToken
        );
    }
}

function clearAuthentication() {
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
}

function saveReturnUrl() {
    const returnUrl =
        window.location.pathname +
        window.location.search;

    sessionStorage.setItem(
        "heritageRedirect",
        returnUrl
    );
}

function redirectToLogin() {
    saveReturnUrl();

    window.location.href =
        "../auth/login.html";
}

function isAuthenticated() {
    const user =
        getLoggedInUser();

    const token =
        getAccessToken();

    return Boolean(
        user &&
        token
    );
}

/*
 * Try to get a new access token using
 * the refresh token before logging
 * the customer out.
 */
async function refreshAccessToken() {
    const refreshToken =
        getRefreshToken();

    if (!refreshToken) {
        return false;
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/auth/refresh`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        refresh_token:
                            refreshToken
                    })
                }
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success ||
            !data.access_token
        ) {
            return false;
        }

        storeAccessToken(
            data.access_token
        );

        return true;
    } catch (error) {
        console.error(
            "Token refresh error:",
            error
        );

        return false;
    }
}

/* ================================
   ADD TO CART
================================ */

async function handleAddToCart() {
    if (!isAuthenticated()) {
        redirectToLogin();
        return;
    }

    const variant =
        getSelectedVariant();

    if (
        !variant ||
        !isVariantAvailable(variant)
    ) {
        showTemporaryMessage(
            "Please select an available product option."
        );

        return;
    }

    elements.addToCart.disabled =
        true;

    try {
        let response =
            await addProductToCart();

        /*
         * If the access token expired,
         * refresh it and retry the request
         * once before sending the user
         * back to login.
         */
        if (response.status === 401) {
            const refreshed =
                await refreshAccessToken();

            if (refreshed) {
                response =
                    await addProductToCart();
            }
        }

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
                "Unable to add product to cart."
            );
        }

        updateCartCount(
            data.cart
        );

        window.location.href =
            "../cart/cart.html";

    } catch (error) {
        console.error(
            "Add to cart error:",
            error
        );

        showTemporaryMessage(
            error.message ||
            "Unable to add this product to cart."
        );

        updateSelectionState();
    }
}

async function addProductToCart() {
    const token =
        getAccessToken();

    return fetch(
        `${API_BASE_URL}/cart/items`,
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/json",
                Authorization:
                    `Bearer ${token}`
            },
            body: JSON.stringify({
                product_id:
                    state.product.id,
                variant_id:
                    getSelectedVariant().id,
                quantity:
                    state.quantity
            })
        }
    );
}

/* ================================
   WHATSAPP ORDER
================================ */

function handleWhatsAppOrder() {
    if (!isAuthenticated()) {
        redirectToLogin();
        return;
    }

    const variant =
        getSelectedVariant();

    if (
        !variant ||
        !isVariantAvailable(variant)
    ) {
        showTemporaryMessage(
            "Please select an available product option."
        );

        return;
    }

    const product =
        state.product;

    const selectedImages =
        getImagesForColour(
            state.selectedColour
        );

    const imageLinks =
        selectedImages
            .slice(0, 5)
            .map(
                image =>
                    image.image_url
            )
            .filter(Boolean);

    const lines = [
        "Hello Skip Fashion, I would like to order:",
        "",
        `Product: ${product.name}`,
        `Category: ${getProductCategory(product)}`,
        `Price: ${formatPrice(
            product.price,
            product.currency
        )}`,
        `Quantity: ${state.quantity}`,
        `Colour: ${
            variant.color_name ||
            "Not specified"
        }`,
        `${formatOptionType(
            variant.option_type ||
                "Option"
        )}: ${
            variant.option_value ||
            "Not specified"
        }`,
        `Product Code: ${
            product.slug ||
            product.id
        }`
    ];

    if (imageLinks.length) {
        lines.push(
            "",
            "Selected Product Images:"
        );

        imageLinks.forEach(
            (imageUrl, index) => {
                lines.push(
                    `${index + 1}. ${imageUrl}`
                );
            }
        );
    }

    lines.push(
        "",
        "Please confirm availability and share payment and delivery details."
    );

    const whatsappUrl =
        `https://wa.me/${OWNER_WHATSAPP}?text=` +
        encodeURIComponent(
            lines.join("\n")
        );

    window.open(
        whatsappUrl,
        "_blank",
        "noopener"
    );
}

/* ================================
   RELATED PRODUCTS
================================ */

async function loadRelatedProducts() {
    try {
        const response =
            await fetch(
                `${API_BASE_URL}/products`
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {
            return;
        }

        state.products =
            Array.isArray(
                data.products
            )
                ? data.products
                : [];

        const related =
            state.products
                .filter(
                    product =>
                        product.id !==
                        state.product.id
                )
                .filter(
                    product =>
                        product.category_id ===
                            state.product.category_id ||
                        product.product_type ===
                            state.product.product_type
                )
                .slice(0, 4);

        renderRelatedProducts(
            related
        );
    } catch (error) {
        console.error(
            "Related products error:",
            error
        );
    }
}

function renderRelatedProducts(
    products
) {
    if (!products.length) {
        elements.relatedSection.hidden =
            true;

        return;
    }

    elements.relatedSection.hidden =
        false;

    elements.relatedProducts.innerHTML =
        "";

    products.forEach(product => {
        const card =
            document.createElement(
                "article"
            );

        card.className =
            "related-product";

        const image =
            getProductPreviewImage(
                product
            );

        const category =
            getProductCategory(
                product
            );

        card.innerHTML = `
            <img
                class="related-product-image"
                src="${escapeAttribute(
                    image
                )}"
                alt="${escapeAttribute(
                    product.name ||
                    "Product"
                )}"
            >

            <div class="related-product-content">

                <div class="related-product-category">
                    ${escapeHtml(
                        category
                    )}
                </div>

                <h3 class="related-product-name">
                    ${escapeHtml(
                        product.name ||
                        "Product"
                    )}
                </h3>

                <div class="related-product-price">
                    ${escapeHtml(
                        formatPrice(
                            product.price,
                            product.currency
                        )
                    )}
                </div>

            </div>
        `;

        card.addEventListener(
            "click",
            () => {
                window.location.href =
                    `details.html?id=${encodeURIComponent(
                        product.id
                    )}`;
            }
        );

        elements.relatedProducts.appendChild(
            card
        );
    });
}

function getProductPreviewImage(
    product
) {
    const images =
        collectProductImages(
            product
        );

    if (images.length) {
        return images[0].image_url;
    }

    return createPlaceholderImage(
        product.name
    );
}

/* ================================
   PRODUCT HELPERS
================================ */

function getProductCategory(
    product
) {
    const type =
        String(
            product.product_type ||
            ""
        ).toLowerCase();

    if (
        type.includes("craft") ||
        type.includes("handmade")
    ) {
        return "Handmade Crafts";
    }

    if (
        type.includes("attire") ||
        type.includes("fashion") ||
        type.includes("clothing")
    ) {
        return "Traditional Attire";
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
        return `${
            currency || "NGN"
        } ${numericPrice.toLocaleString()}`;
    }
}

function updateAccountLink() {
    const user =
        getLoggedInUser();

    if (!elements.accountLink) {
        return;
    }

    elements.accountLink.href =
        user
            ? "../account/index.html"
            : "../auth/login.html";

    elements.accountLink.textContent =
        user
            ? "My Account"
            : "Account";
}

function updateCartCount(cart) {
    if (!cart) {
        return;
    }

    const totalQuantity =
        Number(
            cart.total_quantity
        ) || 0;

    const cartElements =
        document.querySelectorAll(
            "[data-cart-count]"
        );

    cartElements.forEach(
        element => {
            element.textContent =
                String(totalQuantity);

            element.hidden =
                totalQuantity <= 0;
        }
    );
}

/* ================================
   PAGE STATE
================================ */

function showLoading() {
    elements.loading.hidden =
        false;

    elements.error.hidden =
        true;

    elements.content.hidden =
        true;
}

function showContent() {
    elements.loading.hidden =
        true;

    elements.error.hidden =
        true;

    elements.content.hidden =
        false;
}

function showError(message) {
    elements.loading.hidden =
        true;

    elements.content.hidden =
        true;

    elements.error.hidden =
        false;

    elements.errorMessage.textContent =
        message;
}

function updateYear() {
    if (elements.currentYear) {
        elements.currentYear.textContent =
            new Date().getFullYear();
    }
}

/* ================================
   SEARCH
================================ */

function openSearch() {
    const searchPanel =
        elements.searchPanel ||
        elements.searchOverlay;

    const searchField =
        elements.searchInput ||
        elements.globalSearch;

    searchPanel?.classList.add(
        "active"
    );

    searchField?.focus();
}

function closeSearch() {
    const searchPanel =
        elements.searchPanel ||
        elements.searchOverlay;

    searchPanel?.classList.remove(
        "active"
    );
}

/* ================================
   NOTIFICATIONS
================================ */

function showTemporaryMessage(
    message
) {
    let notification =
        document.getElementById(
            "productNotification"
        );

    if (!notification) {
        notification =
            document.createElement(
                "div"
            );

        notification.id =
            "productNotification";

        Object.assign(
            notification.style,
            {
                position: "fixed",
                right: "20px",
                bottom: "20px",
                zIndex: "9999",
                maxWidth: "360px",
                padding: "15px 18px",
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
        setTimeout(
            () => {
                notification.style.display =
                    "none";
            },
            3500
        );
}

/* ================================
   IMAGE HELPERS
================================ */

function createPlaceholderImage(
    name = "Skip Fashion Product"
) {
    const text =
        encodeURIComponent(name);

    return `data:image/svg+xml;charset=UTF-8,
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
    `.replace(
        /\s+/g,
        " "
    );
}

function escapeHtml(value) {
    return String(
        value ?? ""
    )
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

function escapeAttribute(value) {
    return escapeHtml(value);
}