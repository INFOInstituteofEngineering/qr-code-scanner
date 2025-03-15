document.addEventListener("DOMContentLoaded", function () {
    // DOM Elements
    const startScanBtn = document.getElementById("start-scan");
    const stopScanBtn = document.getElementById("stop-scan");
    const scannerView = document.getElementById("scanner-view");
    const qrVideo = document.getElementById("qr-video");
    const ticketIdInput = document.getElementById("ticket-id-input");
    const manualSearchBtn = document.getElementById("manual-search");
    const resultContainer = document.getElementById("result-container");
    const closeResultBtn = document.getElementById("close-result");
    const statusIndicator = document.getElementById("status-indicator");
    const statusText = document.getElementById("status-text");
    const ticketId = document.getElementById("ticket-id");
    const scanTime = document.getElementById("scan-time");
    const participantName = document.getElementById("participant-name");
    const participantEmail = document.getElementById("participant-email");
    const participantPhone = document.getElementById("participant-phone");
    const participantCollege = document.getElementById("participant-college");
    const participantDepartment = document.getElementById("participant-department");
    const participantYear = document.getElementById("participant-year");
    const eventsList = document.getElementById("events-list");
    const paymentStatus = document.getElementById("payment-status");
    const markAttendedBtn = document.getElementById("mark-attended");
    const markPaidBtn = document.getElementById("mark-paid");

    // QR Scanner instance
    let html5QrCode = null;

    // Debug logging function
    function logDebug(message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        if (data) {
            console.log(`[${timestamp}] ${message}`, data);
        } else {
            console.log(`[${timestamp}] ${message}`);
        }
    }

    // Start scanner with proper initialization
    startScanBtn.addEventListener("click", function () {
        logDebug("Start scan button clicked");
        
        // First, make sure the scanner view is visible and empty
        scannerView.innerHTML = '<div class="scan-region-highlight"></div>';
        scannerView.style.display = 'block';
        
        // Update button visibility
        startScanBtn.classList.add("hidden");
        stopScanBtn.classList.remove("hidden");
        
        // Create an instance of Html5QrCode
        try {
            // We'll use the scanner-view div directly
            html5QrCode = new Html5Qrcode("scanner-view");
            
            html5QrCode.start(
                { facingMode: "environment" }, // Use the environment/rear camera
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText) => {
                    // Success callback
                    logDebug("QR Code scanned:", decodedText);
                    
                    // Play success sound
                    const successAudio = new Audio("https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/audio/annotation-check.m4a");
                    successAudio.play();
                    
                    // Stop the scanner
                    stopScanner();
                    
                    // Process the scanned data
                    fetchParticipantDetails(decodedText);
                },
                (errorMessage) => {
                    // Don't log all the error messages as they occur constantly during scanning
                }
            ).catch(err => {
                logDebug("Error starting scanner:", err);
                alert("Could not start scanner: " + err);
                startScanBtn.classList.remove("hidden");
                stopScanBtn.classList.add("hidden");
            });
        } catch (err) {
            logDebug("Exception when creating scanner:", err);
            alert("Failed to initialize scanner: " + err);
            startScanBtn.classList.remove("hidden");
            stopScanBtn.classList.add("hidden");
        }
    });

    // Function to stop the scanner
    function stopScanner() {
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                logDebug("Scanner stopped successfully");
                startScanBtn.classList.remove("hidden");
                stopScanBtn.classList.add("hidden");
                html5QrCode = null;
            }).catch(err => {
                logDebug("Error stopping scanner:", err);
                startScanBtn.classList.remove("hidden");
                stopScanBtn.classList.add("hidden");
                html5QrCode = null;
            });
        }
    }

    // Stop scanner button click handler
    stopScanBtn.addEventListener("click", function() {
        logDebug("Stop scan button clicked");
        stopScanner();
    });

    // Manual search button click handler
    manualSearchBtn.addEventListener("click", function() {
        const manualTicketId = ticketIdInput.value.trim();
        logDebug("Manual ticket ID search:", manualTicketId);
        
        if (manualTicketId) {
            fetchParticipantDetails(manualTicketId);
        } else {
            alert("Please enter a valid ticket ID");
        }
    });

    // Fetch participant details from server
    async function fetchParticipantDetails(id) {
        logDebug("Fetching details for ticket ID:", id);
        
        // Clear previous results
        resetResultDisplay();
        
        // Show loading state
        resultContainer.classList.remove("hidden");
        statusIndicator.className = "status-indicator";
        statusIndicator.classList.add("status-pending");
        statusText.textContent = "Searching...";
        ticketId.textContent = id;
        scanTime.textContent = new Date().toLocaleString();
        
        try {
            const apiUrl = `http://localhost:8000/participant/${id}`;
            logDebug("Calling API:", apiUrl);
            
            const response = await fetch(apiUrl);
            logDebug("API response status:", response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            logDebug("API response data:", data);
            
            if (data.status === "success" && data.participant) {
                displayParticipantDetails(data.participant);
            } else {
                showError("Invalid Ticket", "Participant not found in database");
            }
        } catch (error) {
            logDebug("Error fetching participant:", error);
            
            if (error.message.includes("Failed to fetch")) {
                showError("Connection Error", "Could not connect to server. Make sure server is running at http://localhost:8000");
            } else {
                showError("Server Error", error.message);
            }
        }
    }

    // Reset result display
    function resetResultDisplay() {
        // Reset all elements
        statusIndicator.className = "status-indicator";
        participantName.textContent = "";
        participantEmail.textContent = "";
        participantPhone.textContent = "";
        participantCollege.textContent = "";
        participantDepartment.textContent = "";
        participantYear.textContent = "";
        eventsList.innerHTML = "";
        paymentStatus.innerHTML = "";
        
        // Enable buttons
        markAttendedBtn.disabled = false;
        markPaidBtn.disabled = false;
    }

    // Display participant details in UI
    function displayParticipantDetails(participant) {
        logDebug("Displaying participant details:", participant);
        
        // Set basic details
        ticketId.textContent = participant.ticket_id;
        scanTime.textContent = new Date().toLocaleString();
        participantName.textContent = participant.name || "N/A";
        participantEmail.textContent = participant.email || "N/A";
        participantPhone.textContent = participant.phone || "N/A";
        participantCollege.textContent = participant.college || "N/A";
        participantDepartment.textContent = participant.department || "N/A";
        participantYear.textContent = participant.year ? `${participant.year}${getYearSuffix(participant.year)} Year` : "N/A";
        
        // Set payment status
        if (participant.payment_status === "paid") {
            paymentStatus.innerHTML = '<span class="status-paid"><i class="fas fa-check-circle"></i> Paid</span>';
        } else {
            paymentStatus.innerHTML = '<span class="status-pending"><i class="fas fa-clock"></i> Payment Pending</span>';
        }

        // Set attendance status
        statusIndicator.className = "status-indicator";
        if (participant.attended) {
            statusIndicator.classList.add("status-verified");
            statusText.textContent = "Attended";
        } else {
            statusIndicator.classList.add("status-new");
            statusText.textContent = "New Registration";
        }
        
        // Set events list
        eventsList.innerHTML = '';
        if (participant.events && participant.events.length > 0) {
            participant.events.forEach(event => {
                const eventBadge = document.createElement("span");
                eventBadge.classList.add("event-badge");
                eventBadge.textContent = formatEventName(event);
                eventsList.appendChild(eventBadge);
            });
        } else {
            eventsList.textContent = "No events registered";
        }
    }

    // Show error in the result container
    function showError(title, message) {
        logDebug("Showing error:", title, message);
        
        statusIndicator.className = "status-indicator";
        statusIndicator.classList.add("status-error");
        statusText.textContent = title;
        
        participantName.textContent = message;
        participantEmail.textContent = "-";
        participantPhone.textContent = "-";
        participantCollege.textContent = "-";
        participantDepartment.textContent = "-";
        participantYear.textContent = "-";
        
        eventsList.innerHTML = '-';
        paymentStatus.innerHTML = '-';
        
        // Disable action buttons
        markAttendedBtn.disabled = true;
        markPaidBtn.disabled = true;
    }

    // Close result button click handler
    closeResultBtn.addEventListener("click", function() {
        resultContainer.classList.add("hidden");
    });

    // Mark as attended button click handler
    markAttendedBtn.addEventListener("click", function() {
        const id = ticketId.textContent;
        logDebug("Marking as attended:", id);
        updateParticipantStatus(id, "attended");
    });

    // Mark as paid button click handler
    markPaidBtn.addEventListener("click", function() {
        const id = ticketId.textContent;
        logDebug("Marking as paid:", id);
        updateParticipantStatus(id, "paid");
    });

    // Update participant status
    async function updateParticipantStatus(id, statusType) {
        logDebug(`Updating status for ${id} to ${statusType}`);
        
        try {
            const response = await fetch("http://localhost:8000/update-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticket_id: id,
                    status_type: statusType
                })
            });
            
            const data = await response.json();
            logDebug("Status update response:", data);
            
            if (data.status === "success") {
                alert(`Participant successfully marked as ${statusType}`);
                
                // Update UI based on status type
                if (statusType === "paid") {
                    paymentStatus.innerHTML = '<span class="status-paid"><i class="fas fa-check-circle"></i> Paid</span>';
                } else if (statusType === "attended") {
                    statusIndicator.className = "status-indicator";
                    statusIndicator.classList.add("status-verified");
                    statusText.textContent = "Attended";
                }
            } else {
                alert("Failed to update participant status: " + (data.message || "Unknown error"));
            }
        } catch (error) {
            logDebug("Error updating status:", error);
            alert("Server error. Please try again.");
        }
    }

    // Helper function to format event names
    function formatEventName(eventValue) {
        const eventMap = {
            "code_sprint": "Code Sprint",
            "ai_challenge": "AI Challenge",
            "battle_bands": "Battle of Bands",
            "art_exhibition": "Art Exhibition",
            "ar_vr_workshop": "AR/VR Workshop",
            "iot_masterclass": "IoT Masterclass"
        };
        
        return eventMap[eventValue] || eventValue;
    }

    // Helper function to get suffix for year (1st, 2nd, etc.)
    function getYearSuffix(year) {
        const num = parseInt(year);
        if (num === 1) return "st";
        if (num === 2) return "nd";
        if (num === 3) return "rd";
        return "th";
    }

    // Add Enter key support for manual input
    ticketIdInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            manualSearchBtn.click();
        }
    });

    // Log startup
    logDebug("INFEST 2K25 QR Scanner initialized");
});