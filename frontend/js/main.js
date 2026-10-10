const products = [
    {
        id: 1,
        name: "Royal Heritage Set",
        category: "Traditional Attire",
        price: "₦85,000",
        image: "assets/images/product-1.jpg",
        tag: "NEW"
    },
    {
        id: 2,
        name: "Handwoven Heritage",
        category: "Traditional Attire",
        price: "₦72,000",
        image: "assets/images/product-2.jpg",
        tag: "FEATURED"
    },
    {
        id: 3,
        name: "Artisan Statement Piece",
        category: "Handmade Crafts",
        price: "₦45,000",
        image: "assets/images/product-3.jpg",
        tag: "HANDMADE"
    },
    {
        id: 4,
        name: "Classic Cultural Set",
        category: "Traditional Attire",
        price: "₦95,000",
        image: "assets/images/product-4.jpg",
        tag: "POPULAR"
    }
];

const WHATSAPP_NUMBER = "2348000000000";

document.addEventListener("DOMContentLoaded", () => {
    initializeHomepage();
});

function initializeHomepage() {
    renderProducts();
    setupScrollReveal();
    setupColorSwitcher();
    setupWhatsApp();
    setupSmoothLinks();
    updateYear();
}

function renderProducts() {
    const container = document.getElementById("featuredProducts");

    if (!container) return;

    container.innerHTML = products.map(product => `
        <article class="product-card reveal">
            <a href="product.html?id=${product.id}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" loading="lazy">
                    <span class="product-tag">${product.tag}</span>
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>${product.category}</p>
                    <div class="product-bottom">
                        <span class="product-price">${product.price}</span>
                        <span class="product-link">↗</span>
                    </div>
                </div>
            </a>
        </article>
    `).join("");
}



function setupScrollReveal() {
    const elements = document.querySelectorAll(".reveal");

    if (!elements.length) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: "0px 0px -50px 0px"
    });

    elements.forEach(element => observer.observe(element));
}

function setupColorSwitcher() {
    const buttons = document.querySelectorAll(".color-dot");
    const image = document.getElementById("colorImage");
    const tag = document.getElementById("colorTag");

    if (!buttons.length || !image) return;

    const colors = {
        all: {
            image: "assets/images/color-purple.jpg",
            label: "ROYAL PURPLE"
        },
        purple: {
            image: "assets/images/color-purple.jpg",
            label: "ROYAL PURPLE"
        },
        burgundy: {
            image: "assets/images/color-burgundy.jpg",
            label: "DEEP BURGUNDY"
        },
        rose: {
            image: "assets/images/color-rose.jpg",
            label: "HERITAGE ROSE"
        },
        orange: {
            image: "assets/images/color-orange.jpg",
            label: "WARM ORANGE"
        }
    };

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            buttons.forEach(item => item.classList.remove("active"));
            button.classList.add("active");

            const selected = colors[button.dataset.color];

            image.style.opacity = "0";

            setTimeout(() => {
                image.src = selected.image;
                tag.textContent = selected.label;
                image.style.opacity = "1";
            }, 250);
        });
    });
}

function setupWhatsApp() {
    const message = encodeURIComponent(
        "Hello Skip Fashion, I would like to make an enquiry about your products."
    );

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

    const general = document.getElementById("generalWhatsapp");
    const floating = document.getElementById("floatingWhatsapp");

    if (general) general.href = url;
    if (floating) floating.href = url;
}

function setupSmoothLinks() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener("click", event => {
            const targetId = link.getAttribute("href");

            if (!targetId || targetId === "#") return;

            const target = document.querySelector(targetId);

            if (!target) return;

            event.preventDefault();

            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    });
}

function updateYear() {
    const year = document.getElementById("year");

    if (year) {
        year.textContent = new Date().getFullYear();
    }
}

function isUserLoggedIn() {
    return Boolean(localStorage.getItem("heritage_user"));
}

function requireAccountBeforeOrder(productId) {
    if (!isUserLoggedIn()) {
        localStorage.setItem("pending_product", productId);
        window.location.href = "account.html?redirect=order";
        return false;
    }

    return true;
}