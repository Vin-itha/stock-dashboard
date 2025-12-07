const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Please enter both email and password");
    return;
  }

  // store email so dashboard can read it
  localStorage.setItem("stockUserEmail", email);

  // go to dashboard page
  window.location.href = "dashboard.html";
});
