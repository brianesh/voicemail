chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "updateFloatingPopup") {
        showFloatingPopup(message.text || "", message.status);
    }
});

function showFloatingPopup(text, status) {
    let popup = document.getElementById("floatingPopup");

    // If popup doesn't exist, create it
    if (!popup) {
        popup = document.createElement("div");
        popup.id = "floatingPopup";
        document.body.appendChild(popup);

        // Apply styles
        Object.assign(popup.style, {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "10px 20px",
            borderRadius: "8px",
            fontSize: "16px",
            zIndex: "10000",
            opacity: "1",
            transition: "opacity 0.5s ease-in-out",
            minWidth: "200px",
            textAlign: "center"
        });
    }

    // Update content
    popup.innerHTML = `<strong>Listening: ${status}</strong><br>${text}`;

    // Keep popup visible while status is ON, else hide after 3s
    if (status === "ON") {
        popup.style.opacity = "1";
    } else {
        setTimeout(() => {
            popup.style.opacity = "0";
            setTimeout(() => popup.remove(), 500);
        }, 3000);
    }
}
