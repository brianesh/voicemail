if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    console.error("Speech Recognition not supported in this browser.");
} else {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    let isActive = false;
    let wakeWordDetected = false;
    let isListening = false;
    let lastCommandTime = 0;

    // Floating Popup UI
    const popup = document.createElement("div");
    popup.id = "speech-popup";
    popup.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 250px;
        padding: 15px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        font-size: 16px;
        border-radius: 10px;
        display: none;
        z-index: 9999;
        box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.3);
        transition: opacity 0.5s ease-in-out;
    `;
    document.body.appendChild(popup);

    function showPopup(message, status) {
        popup.innerHTML = `<b>Status:</b> ${status} <br> <b>You said:</b> ${message}`;
        popup.style.display = "block";
        popup.style.opacity = "1";

        clearTimeout(popup.hideTimeout);
        popup.hideTimeout = setTimeout(() => {
            popup.style.opacity = "0";
            setTimeout(() => {
                popup.style.display = "none";
            }, 500);
        }, 2500);
    }

    function speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
    }

    async function getAccessToken() {
        let accessToken = localStorage.getItem("access_token");
        let refreshToken = localStorage.getItem("refresh_token");

        if (!accessToken) {
            console.error("Access token is missing.");
            speak("Please log in to access emails.");
            return null;
        }

        // Verify if the token is still valid
        try {
            const response = await fetch("https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + accessToken);
            const data = await response.json();

            if (data.error) {
                console.warn("Access token expired. Attempting to refresh...");
                return await refreshAccessToken(refreshToken);
            }

            return accessToken;
        } catch (error) {
            console.error("Error verifying token:", error);
            return null;
        }
    }

    async function refreshAccessToken(refreshToken) {
        if (!refreshToken) {
            console.error("No refresh token available. Please log in again.");
            speak("Your session expired. Please log in again.");
            return null;
        }

        try {
            const response = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: "YOUR_CLIENT_ID",
                    client_secret: "YOUR_CLIENT_SECRET",
                    refresh_token: refreshToken,
                    grant_type: "refresh_token"
                }),
            });

            const data = await response.json();

            if (data.access_token) {
                localStorage.setItem("access_token", data.access_token);
                console.log("Access token refreshed successfully.");
                return data.access_token;
            } else {
                console.error("Failed to refresh token:", data);
                speak("Unable to refresh access. Please log in again.");
                return null;
            }
        } catch (error) {
            console.error("Error refreshing token:", error);
            return null;
        }
    }

    function executeCommand(transcript) {
        let lowerTranscript = transcript.toLowerCase().trim();

        const commands = {
            "login": ["login", "log in", "sign in"],
        };

        const urls = {
            "login": "/login",  // Replace with your actual login URL or logic
        };

        let matchedCommand = Object.keys(commands).find(command =>
            commands[command].some(phrase => lowerTranscript.includes(phrase))
        );

        if (matchedCommand) {
            let now = Date.now();
            if (now - lastCommandTime < 3000) return;

            lastCommandTime = now;
            showPopup(`Logging in...`, "Processing");
            speak(`Logging in...`);

            if (matchedCommand === "login") {
                // Prompt for username and password via voice
                promptForCredentials();
                return;
            }

            setTimeout(() => {
                window.open(urls[matchedCommand], "_self");
            }, 1500);
            return;
        }

        let responses = ["I didn't catch that. Try again?", "Can you repeat?", "I'm not sure what you meant."];
        let randomResponse = responses[Math.floor(Math.random() * responses.length)];
        showPopup(randomResponse, "Error");
        speak(randomResponse);
    }

    // Prompt user for username and password via voice
    function promptForCredentials() {
        speak("Please say your username.");
        recognition.onresult = (event) => {
            let result = event.results[event.results.length - 1][0];
            let transcript = result.transcript.trim();
            let username = transcript;

            showPopup(`Username: ${username}`, "Processing");
            speak(`You said: ${username}. Please say your password.`);

            recognition.onresult = (event) => {
                result = event.results[event.results.length - 1][0];
                transcript = result.transcript.trim();
                let password = transcript;

                showPopup(`Password: ${password}`, "Processing");
                speak(`You said: ${password}. Logging you in.`);

                // Attempt to log in with the username and password (replace this with actual login logic)
                attemptLogin(username, password);
            };
        };
    }

    // Dummy login attempt (replace with your actual login logic)
    function attemptLogin(username, password) {
        if (username === "user" && password === "password") {
            speak("Login successful.");
            showPopup("Login successful", "SUCCESS");
        } else {
            speak("Invalid credentials. Please try again.");
            showPopup("Invalid credentials. Please try again.", "ERROR");
        }
    }

    recognition.onstart = () => {
        isListening = true;
        showPopup("Listening...", "ON");
    };

    recognition.onresult = (event) => {
        let result = event.results[event.results.length - 1][0];
        let transcript = result.transcript.trim().toLowerCase();
        let confidence = result.confidence;

        if (confidence < 0.7) return;

        console.log("You said:", transcript);
        showPopup(transcript, isActive ? "ON" : "OFF");

        let wakeWords = ["hey email", "hi email", "hey Emil", "hello email"];
        let sleepCommands = ["sleep email", "stop email", "turn off email"];

        if (wakeWords.some(word => transcript.includes(word))) {
            isActive = true;
            wakeWordDetected = true;
            showPopup("Voice Control Activated", "ACTIVE");
            speak("Voice control activated. How can I assist?");
            return;
        }

        if (sleepCommands.some(word => transcript.includes(word))) {
            isActive = false;
            wakeWordDetected = false;
            showPopup("Voice Control Deactivated", "SLEEP");
            speak("Voice control deactivated. Say 'Hey email' to reactivate.");
            return;
        }

        if (isActive) {
            executeCommand(transcript);
        }
    };

    recognition.onend = () => {
        isListening = false;
        if (wakeWordDetected) {
            setTimeout(() => recognition.start(), 1000);
        }
    };

    recognition.start();
}
