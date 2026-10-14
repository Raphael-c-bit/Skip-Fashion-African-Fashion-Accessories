const API_BASE_URL = "http://127.0.0.1:5000/api";

const state = {
    products: [],
    categories: [],
    filteredProducts: [],
    selectedCategory: "all",
    searchTerm: "",
    sortBy: "latest",
    selectedColor: "all",
    selectedSize: "all"
};

const elements = {
    productGrid: document.querySelector("#productsGrid"),
    resultCount: document.querySelector("#resultCount"),
    emptyState: document.querySelector("#emptyState"),
    resetEmpty: document.querySelector("#resetEmpty"),

    searchButton: document.querySelector("#searchButton"),
    searchOverlay: document.querySelector("#searchOverlay"),
    searchClose: document.querySelector("#searchClose"),
    searchInput: document.querySelector("#searchInput"),

    sortSelect: document.querySelector("#sortProducts"),

    categoryButtons: document.querySelectorAll(
        ".category-btn[data-category]"
    ),

    categoryFilters: document.querySelectorAll(
        'input[data-filter="category"]'
    ),

    colourOptions: document.querySelector("#colourOptions"),
    sizeButtons: document.querySelectorAll(
        ".size-options button[data-size]"
    ),

    filterToggle: document.querySelector("#filterToggle"),
    filters: document.querySelector("#filters"),
    closeFilters: document.querySelector("#closeFilters"),
    filterOverlay: document.querySelector("#filterOverlay"),
    clearFilters: document.querySelector("#clearFilters"),

    mobileMenuButton: document.querySelector("#mobileMenuButton"),
    mobileNav: document.querySelector("#mobileNav"),

    productModal: document.querySelector("#productModal"),
    modalOverlay: document.querySelector("#modalOverlay"),
    modalClose: document.querySelector("#modalClose"),

    year: document.querySelector("#year")
};

document.addEventListener("DOMContentLoaded", initShop);

async function initShop() {
    setupEvents();
    updateYear();
    setupRevealAnimations();
    await loadShopData();
}

function setupEvents() {
    /*
     * Category buttons
     */
    elements.categoryButtons.forEach(button => {
        button.addEventListener("click", () => {
            const category = button.dataset.category || "all";
            setCategory(category);
        });
    });

    /*
     * Category checkboxes
     */
    elements.categoryFilters.forEach(checkbox => {
        checkbox.addEventListener("change", () => {
            const category = checkbox.value;

            if (checkbox.checked) {
                elements.categoryFilters.forEach(otherCheckbox => {
                    if (otherCheckbox !== checkbox) {
                        otherCheckbox.checked = false;
                    }
                });

                setCategory(category);
            } else {
                setCategory("all");
            }
        });
    });

    /*
     * Search
     */
    if (elements.searchInput) {
        elements.searchInput.addEventListener("input", event => {
            state.searchTerm = event.target.value
                .trim()
                .toLowerCase();

            applyFilters();
        });
    }

    /*
     * Sort
     */
    if (elements.sortSelect) {
        elements.sortSelect.addEventListener("change", event => {
            state.sortBy = event.target.value;
            applyFilters();
        });
    }

    /*
     * Colour filters
     */
    if (elements.colourOptions) {
        elements.colourOptions.addEventListener("click", event => {
            const button = event.target.closest(".colour-option");

            if (!button) {
                return;
            }

            const colour = button.dataset.colour || "all";

            state.selectedColor =
                state.selectedColor === colour ? "all" : colour;

            updateColourButtons();
            applyFilters();
        });
    }

    /*
     * Size filters
     */
    elements.sizeButtons.forEach(button => {
        button.addEventListener("click", () => {
            const size = button.dataset.size || "all";

            if (state.selectedSize === size) {
                state.selectedSize = "all";
            } else {
                state.selectedSize = size;
            }

            updateSizeButtons();
            applyFilters();
        });
    });

    /*
     * Clear filters
     */
    if (elements.clearFilters) {
        elements.clearFilters.addEventListener(
            "click",
            clearFilters
        );
    }

    if (elements.resetEmpty) {
        elements.resetEmpty.addEventListener(
            "click",
            clearFilters
        );
    }

    /*
     * Search overlay
     */
    if (elements.searchButton) {
        elements.searchButton.addEventListener(
            "click",
            openSearch
        );
    }

    if (elements.searchClose) {
        elements.searchClose.addEventListener(
            "click",
            closeSearch
        );
    }

    if (elements.searchOverlay) {
        elements.searchOverlay.addEventListener("click", event => {
            if (event.target === elements.searchOverlay) {
                closeSearch();
            }
        });
    }

    /*
     * Filter drawer
     */
    if (elements.filterToggle) {
        elements.filterToggle.addEventListener(
            "click",
            openFilters
        );
    }

    if (elements.closeFilters) {
        elements.closeFilters.addEventListener(
            "click",
            closeFilters
        );
    }

    if (elements.filterOverlay) {
        elements.filterOverlay.addEventListener(
            "click",
            closeFilters
        );
    }

    /*
     * Mobile navigation
     */
    if (elements.mobileMenuButton) {
        elements.mobileMenuButton.addEventListener(
            "click",
            toggleMobileMenu
        );
    }

    /*
     * Product modal
     *
     * The Shop page now sends users to Product Details.
     * The existing modal markup is kept in the HTML so we do
     * not remove your existing design, but product cards do
     * not use the old direct WhatsApp modal flow.
     */
    if (elements.modalClose) {
        elements.modalClose.addEventListener(
            "click",
            closeProductModal
        );
    }

    if (elements.modalOverlay) {
        elements.modalOverlay.addEventListener(
            "click",
            closeProductModal
        );
    }

    /*
     * Escape key
     */
    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") {
            return;
        }

        closeSearch();
        closeFilters();
        closeProductModal();
    });
}

async function loadShopData() {
    showLoading();

    try {
        const [productsResponse, categoriesResponse] =
            await Promise.all([
                fetch(`${API_BASE_URL}/products`),
                fetch(`${API_BASE_URL}/categories`)
            ]);

        if (!productsResponse.ok) {
            throw new Error(
                "Unable to load products."
            );
        }

        const productsData =
            await productsResponse.json();

        state.products = extractData(productsData).filter(
            product => product.is_active !== false
        );

        if (categoriesResponse.ok) {
            const categoriesData =
                await categoriesResponse.json();

            state.categories =
                extractData(categoriesData);
        } else {
            state.categories = [];
        }

        populateColourOptions();
        applyFilters();
    } catch (error) {
        console.error(
            "Shop loading error:",
            error
        );

        showError();
    }
}

function extractData(response) {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response.data)) {
        return response.data;
    }

    if (Array.isArray(response.products)) {
        return response.products;
    }

    if (Array.isArray(response.categories)) {
        return response.categories;
    }

    return [];
}

function applyFilters() {
    let products = [...state.products];

    /*
     * Category
     */
    if (state.selectedCategory !== "all") {
        products = products.filter(product => {
            return matchesCategory(
                product,
                state.selectedCategory
            );
        });
    }

    /*
     * Search
     */
    if (state.searchTerm) {
        products = products.filter(product => {
            const searchableText = [
                product.name,
                product.description,
                product.slug,
                product.product_type,
                product.category?.name,
                product.category_name
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(
                state.searchTerm
            );
        });
    }

    /*
     * Colour
     */
    if (state.selectedColor !== "all") {
        products = products.filter(product => {
            return getVariants(product).some(variant => {
                return (
                    String(
                        variant.color_name || ""
                    ).toLowerCase() ===
                    state.selectedColor.toLowerCase()
                );
            });
        });
    }

    /*
     * Size
     */
    if (state.selectedSize !== "all") {
        products = products.filter(product => {
            return getVariants(product).some(variant => {
                return (
                    String(
                        variant.option_value || ""
                    ).toLowerCase() ===
                    state.selectedSize.toLowerCase()
                );
            });
        });
    }

    /*
     * Sort
     */
    products = sortProducts(products);

    state.filteredProducts = products;

    renderProducts(products);
    updateResultCount(products.length);
    updateEmptyState(products.length === 0);
}

function sortProducts(products) {
    switch (state.sortBy) {
        case "price-low":
            return products.sort((a, b) => {
                return (
                    Number(a.price || 0) -
                    Number(b.price || 0)
                );
            });

        case "price-high":
            return products.sort((a, b) => {
                return (
                    Number(b.price || 0) -
                    Number(a.price || 0)
                );
            });

        case "name":
            return products.sort((a, b) => {
                return String(a.name || "").localeCompare(
                    String(b.name || "")
                );
            });

        case "latest":
        default:
            return products.sort((a, b) => {
                return (
                    new Date(b.created_at || 0) -
                    new Date(a.created_at || 0)
                );
            });
    }
}

function renderProducts(products) {
    if (!elements.productGrid) {
        return;
    }

    elements.productGrid.innerHTML = "";

    products.forEach(product => {
        const card = createProductCard(product);

        elements.productGrid.appendChild(card);
    });
}

function createProductCard(product) {
    const card = document.createElement("article");

    card.className = "product-card";
    card.dataset.productId = product.id;
    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");

    card.setAttribute(
        "aria-label",
        `View details for ${product.name}`
    );

    const image = getProductImage(product);
    const category = getProductCategory(product);
    const price = formatPrice(
        product.price,
        product.currency
    );

    const variants = getVariants(product);

    const available = variants.some(variant => {
        return (
            variant.is_available !== false &&
            Number(variant.stock_quantity || 0) > 0
        );
    });

    card.innerHTML = `
        <div class="product-image">

            <img
                src="${escapeAttribute(image.url)}"
                alt="${escapeAttribute(image.alt)}"
                loading="lazy"
            >

            ${
                product.is_featured
                    ? `
                        <span class="product-badge">
                            Featured
                        </span>
                    `
                    : ""
            }

            ${
                !available
                    ? `
                        <span class="product-badge sold-out">
                            Sold Out
                        </span>
                    `
                    : ""
            }

            <button
                type="button"
                class="product-action"
                data-product-view="${escapeAttribute(
                    product.id
                )}"
                aria-label="View ${escapeAttribute(
                    product.name
                )}"
            >
                View Product
            </button>

        </div>

        <div class="product-info">

            <span class="product-category">
                ${escapeHtml(category)}
            </span>

            <h3 class="product-name">
                ${escapeHtml(product.name)}
            </h3>

            <p class="product-price">
                ${escapeHtml(price)}
            </p>

        </div>
    `;

    /*
     * View Product button
     */
    const viewButton =
        card.querySelector("[data-product-view]");

    if (viewButton) {
        viewButton.addEventListener("click", event => {
            event.stopPropagation();

            openProductDetails(product.id);
        });
    }

    /*
     * Clicking the card
     */
    card.addEventListener("click", event => {
        if (
            event.target.closest("button") ||
            event.target.closest("a")
        ) {
            return;
        }

        openProductDetails(product.id);
    });

    /*
     * Keyboard accessibility
     */
    card.addEventListener("keydown", event => {
        if (
            event.key === "Enter" ||
            event.key === " "
        ) {
            event.preventDefault();

            openProductDetails(product.id);
        }
    });

    /*
     * Image fallback
     */
    const imageElement =
        card.querySelector("img");

    if (imageElement) {
        imageElement.addEventListener(
            "error",
            () => {
                imageElement.src =
                    "../assets/images/general/product-placeholder.jpg";
            },
            { once: true }
        );
    }

    return card;
}

function openProductDetails(productId) {
    if (!productId) {
        return;
    }

    /*
     * shop.html is inside:
     * frontend/pages/
     *
     * Product Details is inside:
     * frontend/product/details.html
     *
     * Therefore the correct relative path is:
     * ../product/details.html
     */
    window.location.href =
        `../product/details.html?id=${encodeURIComponent(
            productId
        )}`;
}

function getProductImage(product) {
    const variants = getVariants(product);

    /*
     * Look for a primary image first.
     */
    for (const variant of variants) {
        const images = Array.isArray(variant.images)
            ? variant.images
            : [];

        const primaryImage = images.find(
            image => image.is_primary === true
        );

        if (primaryImage?.image_url) {
            return {
                url: primaryImage.image_url,
                alt:
                    primaryImage.alt_text ||
                    product.name
            };
        }
    }

    /*
     * If no primary image exists,
     * use the first available variant image.
     */
    for (const variant of variants) {
        const images = Array.isArray(variant.images)
            ? variant.images
            : [];

        if (
            images.length &&
            images[0]?.image_url
        ) {
            return {
                url: images[0].image_url,
                alt:
                    images[0].alt_text ||
                    product.name
            };
        }
    }

    /*
     * Product-level image.
     */
    if (product.image_url) {
        return {
            url: product.image_url,
            alt: product.name
        };
    }

    if (product.image) {
        return {
            url: product.image,
            alt: product.name
        };
    }

    /*
     * Local fallback.
     */
    return {
        url:
            "../assets/images/general/product-placeholder.jpg",
        alt: product.name
    };
}

function getVariants(product) {
    return Array.isArray(product.variants)
        ? product.variants
        : [];
}

function getProductCategory(product) {
    if (product.category?.name) {
        return product.category.name;
    }

    if (product.category_name) {
        return product.category_name;
    }

    const type =
        String(product.product_type || "")
            .toLowerCase();

    if (
        type.includes("craft") ||
        type.includes("handmade")
    ) {
        return "Handmade Crafts";
    }

    if (
        type.includes("attire") ||
        type.includes("cloth") ||
        type.includes("fashion")
    ) {
        return "Traditional Attire";
    }

    return "Skip Fashion Collection";
}

function matchesCategory(product, category) {
    if (category === "all") {
        return true;
    }

    const productCategory =
        getProductCategory(product).toLowerCase();

    const productType =
        String(product.product_type || "")
            .toLowerCase();

    if (category === "attire") {
        return (
            productCategory.includes("attire") ||
            productCategory.includes("traditional") ||
            productType.includes("attire") ||
            productType.includes("fashion") ||
            productType.includes("cloth")
        );
    }

    if (category === "crafts") {
        return (
            productCategory.includes("craft") ||
            productCategory.includes("handmade") ||
            productType.includes("craft") ||
            productType.includes("handmade")
        );
    }

    return (
        productCategory === category.toLowerCase() ||
        productType === category.toLowerCase()
    );
}

function populateColourOptions() {
    if (!elements.colourOptions) {
        return;
    }

    const colours = new Set();

    state.products.forEach(product => {
        getVariants(product).forEach(variant => {
            if (variant.color_name) {
                colours.add(
                    String(variant.color_name)
                );
            }
        });
    });

    elements.colourOptions.innerHTML = "";

    [...colours]
        .sort((a, b) => a.localeCompare(b))
        .forEach(colour => {
            const button =
                document.createElement("button");

            button.type = "button";
            button.className = "colour-option";
            button.dataset.colour = colour;

            button.title = colour;
            button.setAttribute(
                "aria-label",
                `Filter by ${colour}`
            );

            const colourValue =
                getSafeColourValue(colour);

            button.style.backgroundColor =
                colourValue;

            elements.colourOptions.appendChild(
                button
            );
        });

    updateColourButtons();
}

function getSafeColourValue(colour) {
    const value =
        String(colour || "")
            .toLowerCase()
            .trim();

    const colourMap = {
        black: "#111111",
        white: "#ffffff",
        cream: "#F5E6C8",
        beige: "#E8D5B7",
        brown: "#795548",
        wine: "#722F37",
        burgundy: "#800020",
        red: "#C62828",
        blue: "#1565C0",
        "royal blue": "#4169E1",
        navy: "#1A237E",
        green: "#2E7D32",
        olive: "#6B6B2A",
        yellow: "#F9A825",
        gold: "#D4AF37",
        orange: "#EF6C00",
        pink: "#D81B60",
        purple: "#6A1B9A",
        grey: "#757575",
        gray: "#757575"
    };

    return colourMap[value] || "#AE445A";
}

function updateColourButtons() {
    if (!elements.colourOptions) {
        return;
    }

    const buttons =
        elements.colourOptions.querySelectorAll(
            ".colour-option"
        );

    buttons.forEach(button => {
        button.classList.toggle(
            "active",
            state.selectedColor !== "all" &&
            button.dataset.colour ===
                state.selectedColor
        );
    });
}

function updateSizeButtons() {
    elements.sizeButtons.forEach(button => {
        button.classList.toggle(
            "active",
            state.selectedSize !== "all" &&
            button.dataset.size ===
                state.selectedSize
        );
    });
}

function setCategory(category) {
    state.selectedCategory = category;

    elements.categoryButtons.forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.category === category
        );
    });

    elements.categoryFilters.forEach(checkbox => {
        checkbox.checked =
            checkbox.value === category;
    });

    applyFilters();
}

function clearFilters() {
    state.selectedCategory = "all";
    state.searchTerm = "";
    state.sortBy = "latest";
    state.selectedColor = "all";
    state.selectedSize = "all";

    if (elements.searchInput) {
        elements.searchInput.value = "";
    }

    if (elements.sortSelect) {
        elements.sortSelect.value = "latest";
    }

    elements.categoryFilters.forEach(
        checkbox => {
            checkbox.checked = false;
        }
    );

    updateColourButtons();
    updateSizeButtons();

    setCategory("all");

    closeFilters();
}

function updateResultCount(count) {
    if (!elements.resultCount) {
        return;
    }

    elements.resultCount.textContent =
        `${count} ${
            count === 1 ? "Product" : "Products"
        }`;
}

function updateEmptyState(isEmpty) {
    if (elements.emptyState) {
        elements.emptyState.hidden = !isEmpty;
    }

    if (elements.productGrid) {
        elements.productGrid.hidden = isEmpty;
    }
}

function showLoading() {
    if (elements.productGrid) {
        elements.productGrid.hidden = true;
    }

    if (elements.emptyState) {
        elements.emptyState.hidden = true;
    }

    if (elements.resultCount) {
        elements.resultCount.textContent =
            "Loading products...";
    }
}

function showError() {
    if (elements.productGrid) {
        elements.productGrid.innerHTML = "";
        elements.productGrid.hidden = true;
    }

    if (elements.emptyState) {
        elements.emptyState.hidden = false;

        const heading =
            elements.emptyState.querySelector("h3");

        const paragraph =
            elements.emptyState.querySelector("p");

        if (heading) {
            heading.textContent =
                "Unable to load products.";
        }

        if (paragraph) {
            paragraph.textContent =
                "Please check that the Skip Fashion backend is running and try again.";
        }
    }

    if (elements.resultCount) {
        elements.resultCount.textContent =
            "Products unavailable";
    }
}

function openSearch() {
    if (!elements.searchOverlay) {
        return;
    }

    elements.searchOverlay.classList.add(
        "active"
    );

    document.body.classList.add(
        "search-open"
    );

    if (elements.searchInput) {
        setTimeout(() => {
            elements.searchInput.focus();
        }, 100);
    }
}

function closeSearch() {
    if (!elements.searchOverlay) {
        return;
    }

    elements.searchOverlay.classList.remove(
        "active"
    );

    document.body.classList.remove(
        "search-open"
    );
}

function openFilters() {
    if (!elements.filters) {
        return;
    }

    elements.filters.classList.add("active");

    if (elements.filterOverlay) {
        elements.filterOverlay.classList.add(
            "active"
        );
    }

    document.body.classList.add(
        "filters-open"
    );
}

function closeFilters() {
    if (elements.filters) {
        elements.filters.classList.remove(
            "active"
        );
    }

    if (elements.filterOverlay) {
        elements.filterOverlay.classList.remove(
            "active"
        );
    }

    document.body.classList.remove(
        "filters-open"
    );
}

function toggleMobileMenu() {
    if (!elements.mobileNav) {
        return;
    }

    elements.mobileNav.classList.toggle(
        "active"
    );

    const isOpen =
        elements.mobileNav.classList.contains(
            "active"
        );

    if (elements.mobileMenuButton) {
        elements.mobileMenuButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );
    }
}

function closeProductModal() {
    if (!elements.productModal) {
        return;
    }

    elements.productModal.classList.remove(
        "active"
    );

    document.body.classList.remove(
        "modal-open"
    );
}

function updateYear() {
    if (elements.year) {
        elements.year.textContent =
            new Date().getFullYear();
    }
}

function setupRevealAnimations() {
    const revealElements =
        document.querySelectorAll(".reveal");

    if (!revealElements.length) {
        return;
    }

    if (
        !("IntersectionObserver" in window)
    ) {
        revealElements.forEach(element => {
            element.classList.add("visible");
        });

        return;
    }

    const observer =
        new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add(
                            "visible"
                        );

                        observer.unobserve(
                            entry.target
                        );
                    }
                });
            },
            {
                threshold: 0.12
            }
        );

    revealElements.forEach(element => {
        observer.observe(element);
    });
}

function formatPrice(
    price,
    currency = "NGN"
) {
    const numericPrice = Number(price);

    if (Number.isNaN(numericPrice)) {
        return "Price unavailable";
    }

    try {
        return new Intl.NumberFormat(
            "en-NG",
            {
                style: "currency",
                currency: currency || "NGN",
                maximumFractionDigits: 0
            }
        ).format(numericPrice);
    } catch (error) {
        return `₦${numericPrice.toLocaleString(
            "en-NG"
        )}`;
    }
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