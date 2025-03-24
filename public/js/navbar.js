// function showSidenav() {
//   const sidenav = document.querySelector(".side-nav")
//   sidenav.style.display = "flex"
// }

// function hideSidenav() {
//     const sidenav = document.querySelector(".side-nav")
//     sidenav.style.display = "none"
// }

function showSidenav() {
  const sidenav = document.querySelector(".side-nav");
  sidenav.style.display = "flex"; // Ensure it is shown before transitioning
  setTimeout(() => sidenav.classList.add("show"), 10); // Add 'show' class with a slight delay for the transition
}

function hideSidenav() {
  const sidenav = document.querySelector(".side-nav");
  sidenav.classList.remove("show"); // Remove 'show' class to slide it out
  setTimeout(() => sidenav.style.display = "none", 400); // Wait for the transition to end before hiding it
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
