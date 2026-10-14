const CHECKOUT_CART_URL = "http://127.0.0.1:5000/api/cart";
const CHECKOUT_ORDERS_URL = "http://127.0.0.1:5000/api/orders";

const OWNER_WHATSAPP = "2349164836936";

let checkoutCart = null;
let isSubmittingOrder = false;

document.addEventListener("DOMContentLoaded", initializeCheckout);


async function initializeCheckout() {
    showElement("checkout-loading");
    hideElement("checkout-content");
    hideElement("checkout-login");
    hideElement("checkout-empty");

    const token = getAccessToken();

    if (!token) {
        hideElement("checkout-loading");
        showElement("checkout-login");
        return;
    }

    await loadCheckoutCart();
}


function getAccessToken() {
    return (
        localStorage.getItem("heritage_access_token") ||
        sessionStorage.getItem("heritage_access_token") ||
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("accessToken")
        || sessionStorage.getItem("accessToken")
    );
}


async function loadCheckoutCart() {
    const token = getAccessToken();

    if (!token) {
        hideElement("checkout-loading");
        showElement("checkout-login");
        return;
    }

    try {
        const response = await fetch(CHECKOUT_CART_URL, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                handleAuthenticationError();
                return;
            }

            throw new Error(
                data.message || "Unable to load your cart."
            );
        }

        checkoutCart = data.cart || data;

        const items = checkoutCart.items || [];

        hideElement("checkout-loading");

        if (!items.length) {
            showElement("checkout-empty");
            return;
        }

        renderCheckoutItems(items);
        renderCheckoutTotals();

        showElement("checkout-content");

        attachCheckoutForm();

    } catch (error) {
        console.error("Checkout cart error:", error);

        hideElement("checkout-loading");

        showCheckoutError(
            error.message || "Unable to load your cart."
        );
    }
}


function renderCheckoutItems(items) {
    const container = document.getElementById("checkout-items");

    if (!container) {
        return;
    }

    container.innerHTML = items.map(item => {

        const productName =
            item.product_name ||
            item.product?.name ||
            "Product";

        const quantity = Number(item.quantity || 1);

        const unitPrice = Number(
            item.unit_price || 0
        );

        const totalPrice = Number(
            item.total_price ||
            unitPrice * quantity
        );

        const variantName =
            getVariantName(item);

        const imageUrl =
            getItemImage(item);

        return `
            <div class="checkout-item">

                <div class="checkout-item-image">
                    <img
                        src="${escapeAttribute(imageUrl)}"
                        alt="${escapeAttribute(productName)}"
                        onerror="this.src='../assets/images/general/product-placeholder.jpg'"
                    >
                </div>

                <div class="checkout-item-details">

                    <h3>
                        ${escapeHtml(productName)}
                    </h3>

                    ${
                        variantName
                            ? `
                                <p class="checkout-item-variant">
                                    ${escapeHtml(variantName)}
                                </p>
                            `
                            : ""
                    }

                    <div class="checkout-item-bottom">

                        <span class="checkout-item-quantity">
                            Qty: ${quantity}
                        </span>

                        <strong>
                            ${formatCurrency(totalPrice)}
                        </strong>

                    </div>

                </div>

            </div>
        `;
    }).join("");
}


function getVariantName(item) {
    if (!item.variant) {
        return item.variant_name || "";
    }

    const variant = item.variant;

    const parts = [];

    if (variant.option_type && variant.option_value) {
        parts.push(
            `${variant.option_type}: ${variant.option_value}`
        );
    }

    if (variant.color_name) {
        parts.push(
            `Color: ${variant.color_name}`
        );
    }

    return parts.join(", ");
}


function getItemImage(item) {
    if (
        item.variant &&
        Array.isArray(item.variant.images) &&
        item.variant.images.length
    ) {
        const primaryImage = item.variant.images.find(
            image => image.is_primary
        );

        if (primaryImage?.image_url) {
            return primaryImage.image_url;
        }

        if (item.variant.images[0]?.image_url) {
            return item.variant.images[0].image_url;
        }
    }

    if (item.product?.image_url) {
        return item.product.image_url;
    }

    return "../assets/images/general/product-placeholder.jpg";
}


function renderCheckoutTotals() {
    if (!checkoutCart) {
        return;
    }

    const subtotal = Number(
        checkoutCart.subtotal || calculateCartSubtotal()
    );

    const totalQuantity = Number(
        checkoutCart.total_quantity ||
        checkoutCart.items?.reduce(
            (total, item) =>
                total + Number(item.quantity || 0),
            0
        ) ||
        0
    );

    const subtotalElement =
        document.getElementById("checkout-subtotal");

    const totalElement =
        document.getElementById("checkout-total");

    if (subtotalElement) {
        subtotalElement.textContent =
            formatCurrency(subtotal);
    }

    if (totalElement) {
        totalElement.textContent =
            formatCurrency(subtotal);
    }

    const summaryCard =
        document.querySelector(".order-summary-card");

    if (summaryCard && totalQuantity) {
        summaryCard.dataset.totalQuantity =
            String(totalQuantity);
    }
}


function calculateCartSubtotal() {
    if (!checkoutCart?.items) {
        return 0;
    }

    return checkoutCart.items.reduce(
        (total, item) => {
            const quantity = Number(
                item.quantity || 0
            );

            const unitPrice = Number(
                item.unit_price || 0
            );

            return total + quantity * unitPrice;
        },
        0
    );
}


function attachCheckoutForm() {
    const form =
        document.getElementById("checkout-form");

    if (!form) {
        return;
    }

    form.addEventListener(
        "submit",
        handleCheckoutSubmit
    );
}


async function handleCheckoutSubmit(event) {
    event.preventDefault();

    if (isSubmittingOrder) {
        return;
    }

    clearCheckoutError();

    const form =
        document.getElementById("checkout-form");

    const submitButton =
        document.getElementById("submit-order");

    const submitText =
        submitButton?.querySelector(".submit-text");

    const submitSpinner =
        submitButton?.querySelector(".submit-spinner");

    const formData =
        new FormData(form);

    const shippingName =
        String(
            formData.get("shipping_name") || ""
        ).trim();

    const shippingPhone =
        String(
            formData.get("shipping_phone") || ""
        ).trim();

    const shippingAddress =
        String(
            formData.get("shipping_address") || ""
        ).trim();

    const shippingCity =
        String(
            formData.get("shipping_city") || ""
        ).trim();

    const shippingState =
        String(
            formData.get("shipping_state") || ""
        ).trim();

    const notes =
        String(
            formData.get("notes") || ""
        ).trim();

    if (!shippingName) {
        showCheckoutError(
            "Please enter your full name."
        );
        return;
    }

    if (!shippingPhone) {
        showCheckoutError(
            "Please enter your phone number."
        );
        return;
    }

    if (!shippingAddress) {
        showCheckoutError(
            "Please enter your delivery address."
        );
        return;
    }

    if (!shippingCity) {
        showCheckoutError(
            "Please enter your city."
        );
        return;
    }

    if (!shippingState) {
        showCheckoutError(
            "Please enter your state."
        );
        return;
    }

    const token = getAccessToken();

    if (!token) {
        showCheckoutError(
            "Your session has expired. Please log in again."
        );

        setTimeout(() => {
            window.location.href =
                "../auth/login.html";
        }, 1200);

        return;
    }

    isSubmittingOrder = true;

    if (submitButton) {
        submitButton.disabled = true;
    }

    if (submitText) {
        submitText.textContent =
            "Creating Your Order...";
    }

    if (submitSpinner) {
        submitSpinner.classList.remove("hidden");
    }

    try {
        const orderPayload = {
            shipping_name: shippingName,
            shipping_phone: shippingPhone,
            shipping_address: shippingAddress,
            shipping_city: shippingCity,
            shipping_state: shippingState,
            notes: notes || null,

            /*
             * The backend currently treats delivery/shipping
             * as zero unless a fee is explicitly provided.
             * We therefore leave it at zero for now.
             */
            shipping_fee: 0
        };

        const response = await fetch(
            CHECKOUT_ORDERS_URL,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(orderPayload)
            }
        );

        const data = await response.json();

        if (!response.ok) {

            if (response.status === 401) {
                handleAuthenticationError();
                return;
            }

            throw new Error(
                data.message ||
                "Unable to create your order."
            );
        }

        if (!data.success || !data.order) {
            throw new Error(
                data.message ||
                "The order could not be created."
            );
        }

        const order = data.order;

        saveLastOrder(order);

        if (submitText) {
            submitText.textContent =
                "Opening WhatsApp...";
        }

        const whatsappUrl =
            buildWhatsAppOrderUrl(
                order,
                shippingName,
                shippingPhone,
                shippingAddress,
                shippingCity,
                shippingState,
                notes
            );

        /*
         * Open WhatsApp immediately after the successful
         * order request while the browser still considers
         * this part of the user's interaction.
         */
        const whatsappWindow =
            window.open(
                whatsappUrl,
                "_blank"
            );

        if (!whatsappWindow) {
            /*
             * If the browser blocks the new tab,
             * give the customer a clickable fallback.
             */
            showWhatsAppFallback(
                whatsappUrl,
                order.order_number
            );

            return;
        }

        setTimeout(() => {
            window.location.href =
                "./confirmation.html";
        }, 700);

    } catch (error) {
        console.error(
            "Create order error:",
            error
        );

        showCheckoutError(
            error.message ||
            "Something went wrong while creating your order."
        );

        isSubmittingOrder = false;

        if (submitButton) {
            submitButton.disabled = false;
        }

        if (submitText) {
            submitText.textContent =
                "Send Order via WhatsApp";
        }

        if (submitSpinner) {
            submitSpinner.classList.add("hidden");
        }
    }
}


function buildWhatsAppOrderUrl(
    order,
    shippingName,
    shippingPhone,
    shippingAddress,
    shippingCity,
    shippingState,
    notes
) {
    const items = order.items || [];

    let message =
        `Hello Skip Fashion,\n\n`;

    message +=
        `I would like to place my order.\n\n`;

    message +=
        `*Order Number:* ${order.order_number}\n`;

    message +=
        `*Customer:* ${shippingName}\n`;

    message +=
        `*Phone:* ${shippingPhone}\n\n`;

    message +=
        `*Delivery Information*\n`;

    message +=
        `${shippingAddress}\n`;

    message +=
        `${shippingCity}, ${shippingState}\n\n`;

    message +=
        `*Order Items*\n`;

    items.forEach((item, index) => {

        message +=
            `${index + 1}. ${item.product_name}\n`;

        if (item.variant_name) {
            message +=
                `   ${item.variant_name}\n`;
        }

        message +=
            `   Qty: ${item.quantity}\n`;

        message +=
            `   Price: ${formatCurrency(
                Number(item.unit_price || 0)
            )}\n`;

        message +=
            `   Subtotal: ${formatCurrency(
                Number(item.subtotal || 0)
            )}\n\n`;
    });

    message +=
        `*Subtotal:* ${formatCurrency(
            Number(order.subtotal || 0)
        )}\n`;

    message +=
        `*Delivery:* ${formatCurrency(
            Number(order.shipping_fee || 0)
        )}\n`;

    message +=
        `*Total:* ${formatCurrency(
            Number(order.total_amount || 0)
        )}\n\n`;

    if (notes) {
        message +=
            `*Order Note:*\n${notes}\n\n`;
    }

    message +=
        `Please confirm my order and delivery details.`;

    return (
        `https://wa.me/${OWNER_WHATSAPP}` +
        `?text=${encodeURIComponent(message)}`
    );
}


function saveLastOrder(order) {
    try {
        localStorage.setItem(
            "heritage_last_order",
            JSON.stringify(order)
        );
    } catch (error) {
        console.warn(
            "Unable to save last order locally:",
            error
        );
    }
}


function showWhatsAppFallback(
    whatsappUrl,
    orderNumber
) {
    const errorElement =
        document.getElementById("checkout-error");

    if (!errorElement) {
        return;
    }

    errorElement.classList.remove("hidden");

    errorElement.innerHTML = `
        <strong>
            Order ${escapeHtml(orderNumber)}
            was created successfully.
        </strong>

        <p>
            Your browser blocked the WhatsApp window.
            Use the button below to continue.
        </p>

        <a
            href="${escapeAttribute(whatsappUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="checkout-whatsapp-link"
        >
            Continue to WhatsApp
        </a>
    `;
}


function handleAuthenticationError() {
    clearCheckoutError();

    localStorage.removeItem(
        "heritage_access_token"
    );

    localStorage.removeItem(
        "access_token"
    );

    localStorage.removeItem(
        "accessToken"
    );

    hideElement("checkout-loading");
    hideElement("checkout-content");

    showElement("checkout-login");
}


function showCheckoutError(message) {
    const errorElement =
        document.getElementById("checkout-error");

    if (!errorElement) {
        return;
    }

    errorElement.textContent = message;

    errorElement.classList.remove("hidden");

    errorElement.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


function clearCheckoutError() {
    const errorElement =
        document.getElementById("checkout-error");

    if (!errorElement) {
        return;
    }

    errorElement.textContent = "";
    errorElement.classList.add("hidden");
}


function formatCurrency(amount) {
    const value = Number(amount) || 0;

    return new Intl.NumberFormat(
        "en-NG",
        {
            style: "currency",
            currency: "NGN",
            minimumFractionDigits: 2
        }
    ).format(value);
}


function showElement(id) {
    const element =
        document.getElementById(id);

    if (element) {
        element.classList.remove("hidden");
    }
}


function hideElement(id) {
    const element =
        document.getElementById(id);

    if (element) {
        element.classList.add("hidden");
    }
}


function escapeHtml(value) {
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