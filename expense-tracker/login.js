const AUTH_KEY = "expense-tracker-auth";
const loginForm = document.querySelector("#login-form");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const message = document.querySelector("#form-message");
const passwordToggle = document.querySelector(".password-toggle");

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    message.classList.remove("is-success");

    if (usernameInput.value.trim() === "Dhiraj" && passwordInput.value === "123456") {
        sessionStorage.setItem(AUTH_KEY, "true");
        message.classList.add("is-success");
        message.textContent = "Login successful. Opening your tracker...";
        window.location.replace("index.html");
        return;
    }

    message.textContent = "That username or password doesn't match. Try again.";
    passwordInput.select();
});

passwordToggle.addEventListener("click", () => {
    const showPassword = passwordInput.type === "password";
    passwordInput.type = showPassword ? "text" : "password";
    passwordToggle.setAttribute("aria-label", showPassword ? "Hide password" : "Show password");
    passwordToggle.title = showPassword ? "Hide password" : "Show password";
    passwordToggle.innerHTML = `<i class="fa-regular ${showPassword ? "fa-eye-slash" : "fa-eye"}" aria-hidden="true"></i>`;
});

document.querySelector("#forgot-password").addEventListener("click", () => {
    message.classList.remove("is-success");
    message.textContent = "Password recovery is not available for this demo account.";
});

document.querySelectorAll("[data-social]").forEach((button) => {
    button.addEventListener("click", () => {
        message.classList.remove("is-success");
        message.textContent = `${button.dataset.social} sign-in is not available in this demo.`;
    });
});