function showSidenav() {
  const sidenav = document.querySelector(".side-nav")
  sidenav.style.display = "flex"
}

function hideSidenav() {
    const sidenav = document.querySelector(".side-nav")
    sidenav.style.display = "none"
}


// Sidebar
const toggleButton = document.getElementById('toggle-btn')
const sidebar = document.getElementById('sidebar')

function toggleSidebar() {
  sidebar.classList.toggle('close')
  toggleButton.classList.toggle('rotate')
}

// Active sidebar
document.addEventListener("DOMContentLoaded", function () {
  const currentPath = window.location.pathname; // Get the current route
  const sidebarLinks = document.querySelectorAll(".sidebar-link");

  sidebarLinks.forEach((link) => {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active"); // Add active class
    }
  });
});
