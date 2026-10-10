// Shared site header behaviour used on every page:
// sticky header shadow, mobile navigation toggle and the search overlay.
(function () {
    const header = document.getElementById("header");
    const menuButton = document.getElementById("mobileMenuButton");
    const mobileNav = document.getElementById("mobileNav");
    const searchButton = document.getElementById("searchButton");
    const overlay = document.getElementById("searchOverlay");
    const closeButton = document.getElementById("searchClose");
    const searchInput = document.getElementById("searchInput");

    if (header) {
        window.addEventListener("scroll", () => {
            header.classList.toggle("scrolled", window.scrollY > 20);
        }, { passive: true });
    }

    if (menuButton && mobileNav) {
        menuButton.addEventListener("click", () => {
            mobileNav.classList.toggle("active");
        });
    }

    if (mobileNav) {
        mobileNav.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                mobileNav.classList.remove("active");
            });
        });
    }

    if (searchButton && overlay) {
        searchButton.addEventListener("click", () => {
            overlay.classList.add("active");
            setTimeout(() => {
                if (searchInput) searchInput.focus();
            }, 300);
        });
    }

    if (closeButton && overlay) {
        closeButton.addEventListener("click", () => {
            overlay.classList.remove("active");
        });
    }

    if (overlay) {
        overlay.addEventListener("click", event => {
            if (event.target === overlay) {
                overlay.classList.remove("active");
            }
        });

        overlay.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                overlay.classList.remove("active");
            }
        });
    }
})();