

const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");

if (contactForm) {
    contactForm.addEventListener("submit", event => {

        event.preventDefault();

        const formData = new FormData(contactForm);

        const name = formData.get("name");
        const email = formData.get("email");
        const phone = formData.get("phone");
        const subject = formData.get("subject");
        const message = formData.get("message");

        if (!name || !email || !subject || !message) {
            formStatus.textContent = "Please complete all required fields.";
            formStatus.className = "form-status error";
            return;
        }

        const whatsappNumber = "2340000000000";

        const whatsappMessage =
            `Hello Skip Fashion,\n\n` +
            `Name: ${name}\n` +
            `Email: ${email}\n` +
            `Phone: ${phone || "Not provided"}\n` +
            `Subject: ${subject}\n\n` +
            `Message:\n${message}`;

        const whatsappUrl =
            `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

        formStatus.textContent =
            "Your message is ready. Opening WhatsApp...";

        formStatus.className = "form-status success";

        window.open(whatsappUrl, "_blank");

        contactForm.reset();
    });
}

const revealElements = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
    entries => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                revealObserver.unobserve(entry.target);
            }

        });

    },
    {
        threshold: 0.12
    }
);

revealElements.forEach(element => {
    revealObserver.observe(element);
});

const year = document.getElementById("year");

if (year) {
    year.textContent = new Date().getFullYear();
}