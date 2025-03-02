const socket = io();

socket.on("newIncident", (data) => {
  const notificationBox = document.getElementById("notificationBox");
  const notificationText = document.getElementById("notificationText");

  if (notificationBox && notificationText) {
    notificationText.innerText = `A new ${data.category} incident was reported: ${data.description}`;
    notificationBox.classList.remove("hidden");
  }
});
