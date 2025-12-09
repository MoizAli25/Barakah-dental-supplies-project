function handleLogin(form, adminPanelPath) {
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    const admin = {
      email: "admin@barakah.com",
      password: "admin123",
      role: "admin"
    };

    // Example customer (you can add more)
    const customer = {
      email: "user@test.com",
      password: "123456",
      role: "customer"
    };

    let user = null;

    if (email === admin.email && password === admin.password) {
      user = admin;
    } else if (email === customer.email && password === customer.password) {
      user = customer;
    }

    if (!user) {
      alert("Invalid email or password");
      return;
    }

    localStorage.setItem("session", JSON.stringify(user));

    if (user.role === "admin") {
      window.location.href = adminPanelPath;       // ADMIN REDIRECT
    } else {
      window.location.href = "index.html";          // WEBSITE REDIRECT
    }
  });
}
