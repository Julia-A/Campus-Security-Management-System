document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ Password toggle script loaded!"); // Debugging

  // Select all toggle password icons
  const toggleIcons = document.querySelectorAll(".toggle-password");

  toggleIcons.forEach(icon => {
    icon.addEventListener("click", function () {
      const targetInput = document.getElementById(this.getAttribute("data-target"));
      if (!targetInput) {
        console.error("⚠️ No input field found for:", this);
        return;
      }

      // Toggle password visibility
      if (targetInput.type === "password") {
        targetInput.type = "text";
        this.classList.replace("bi-eye-slash", "bi-eye"); // Switch icon
      } else {
        targetInput.type = "password";
        this.classList.replace("bi-eye", "bi-eye-slash"); // Switch back
      }
    });
  });
});
