chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "updateFloatingPopup") {
        showFloatingPopup(message.text, message.status);
    }
});

function showFloatingPopup(text, status) {
    let popup = document.getElementById("floatingPopup");

    // If the popup doesn't exist, create it
    if (!popup) {
        popup = document.createElement("div");
        popup.id = "floatingPopup";
        document.body.appendChild(popup);

        // Apply styles
        Object.assign(popup.style, {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            background: "rgba(0, 0, 0, 0.9)",
            color: "#fff",
            padding: "12px 18px",
            borderRadius: "8px",
            fontSize: "16px",
            fontFamily: "Arial, sans-serif",
            zIndex: "9999",
            opacity: "1",
            transition: "opacity 0.3s ease-in-out",
            minWidth: "220px",
            textAlign: "center",
            boxShadow: "0px 4px 10px rgba(0,0,0,0.3)"
        });
    }

    // Update content dynamically
    popup.innerHTML = `<strong>${status === "ON" ? "🎤 Listening..." : "🛑 Stopped"}</strong><br>${text}`;

    // If listening stops, fade out and remove
    if (status === "OFF") {
        setTimeout(() => {
            popup.style.opacity = "0";
            setTimeout(() => popup.remove(), 500);
        }, 3000);
    }
}
