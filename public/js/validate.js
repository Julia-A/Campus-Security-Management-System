// Password Validation
document.addEventListener('DOMContentLoaded', () => {
    const passwordInputs = document.querySelectorAll('input[type="password"]');
  
    passwordInputs.forEach(input => {
      input.addEventListener('input', () => {
        const password = input.value;
        const isValid = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);
        if (!isValid) {
          input.setCustomValidity("Password must have at least 8 characters, including uppercase, lowercase, number, and symbol.");
        } else {
          input.setCustomValidity("");
        }
      });
    });
  });
  