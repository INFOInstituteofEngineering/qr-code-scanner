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
    let html5QrCode;

    // Start scanner
startScanBtn.addEventListener("click", async function () {
    startScanBtn.classList.add("hidden");
    stopScanBtn.classList.remove("hidden");
    qrVideo.classList.remove("hidden");

    try {
        // Request camera permissions
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        qrVideo.srcObject = stream; // Assign the camera stream to the video element
        qrVideo.play(); // Start playing the video stream

        html5QrCode = new Html5Qrcode("qr-video");
        html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 200, height: 200 },
            },
            onScanSuccess,
            onScanFailure
        );
    } catch (error) {
        console.error("Camera access denied:", error);
        alert("Failed to access camera. Please ensure your camera is connected and permissions are granted.");
        startScanBtn.classList.remove("hidden");
        stopScanBtn.classList.add("hidden");
        qrVideo.classList.add("hidden");
    }
        
        html5QrCode = new Html5Qrcode("qr-video");
        html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 200, height: 200 }
            },
            onScanSuccess,
            onScanFailure
        );
    });

    // Stop scanner
    stopScanBtn.addEventListener("click", function() {
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                startScanBtn.classList.remove("hidden");
                stopScanBtn.classList.add("hidden");
                qrVideo.classList.add("hidden");
            }).catch(err => {
                console.error("Error stopping scanner:", err);
            });
        }
    });

    // Manual search
    manualSearchBtn.addEventListener("click", function() {
        const manualTicketId = ticketIdInput.value.trim();
        if (manualTicketId) {
            fetchParticipantDetails(manualTicketId);
        } else {
            alert("Please enter a valid ticket ID");
        }
    });

    // Close result
    closeResultBtn.addEventListener("click", function() {
        resultContainer.classList.add("hidden");
    });

    // Mark as attended
    markAttendedBtn.addEventListener("click", function() {
        const id = ticketId.textContent;
        updateParticipantStatus(id, "attended");
    });

    // Mark as paid
    markPaidBtn.addEventListener("click", function() {
        const id = ticketId.textContent;
        updateParticipantStatus(id, "paid");
    });

    // Handle successful QR scan
    function onScanSuccess(decodedText) {
        // Play success sound
        const successAudio = new Audio("https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/audio/annotation-check.m4a");
        successAudio.play();

        // Stop scanner after successful scan
        html5QrCode.stop().then(() => {
            startScanBtn.classList.remove("hidden");
            stopScanBtn.classList.add("hidden");
            qrVideo.classList.add("hidden");
            
            // Fetch participant details
            fetchParticipantDetails(decodedText);
        }).catch(err => {
            console.error("Error stopping scanner:", err);
        });
    }

    // Handle scan errors
    function onScanFailure(error) {
        // Don't show errors for failed scans
        console.log("QR scan error (this is normal):", error);
    }

    // Fetch participant details from server
    async function fetchParticipantDetails(ticketId) {
        console.log("Fetching details for ticket ID:", ticketId);
        try {
            const response = await fetch(`http://localhost:8000/participant/${ticketId}`);
            console.log("Response status:", response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
    
            const data = await response.json();
            console.log("Response Data:", data);
    
            if (data.status === "success") {
                displayParticipantDetails(data.participant);
            } else {
                showError("Invalid QR Code", "Participant not found");
            }
        } catch (error) {
            console.error("Error fetching participant:", error);
            showError("Server Error", "Could not connect to server");
        }
    }

    // Update participant status
    async function updateParticipantStatus(ticketId, statusType) {
        try {
            const response = await fetch(`http://localhost:8000/update-status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticket_id: ticketId,
                    status_type: statusType
                })
            });
            
            const data = await response.json();
            
            if (data.status === "success") {
                alert(`Participant successfully marked as ${statusType}`);
                
                // Update UI based on status type
                if (statusType === "paid") {
                    paymentStatus.innerHTML = '<span class="status-paid"><i class="fas fa-check-circle"></i> Paid</span>';
                } else if (statusType === "attended") {
                    statusIndicator.classList.add("status-verified");
                    statusText.textContent = "Attended";
                }
            } else {
                alert("Failed to update participant status");
            }
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Server error. Please try again.");
        }
    }

    // Display participant details in UI
    function displayParticipantDetails(participant) {
        // Set basic details
        ticketId.textContent = participant.ticket_id;
        scanTime.textContent = new Date().toLocaleString();
        participantName.textContent = participant.name;
        participantEmail.textContent = participant.email;
        participantPhone.textContent = participant.phone;
        participantCollege.textContent = participant.college;
        participantDepartment.textContent = participant.department;
        participantYear.textContent = `${participant.year}${getYearSuffix(participant.year)} Year`;
        
        // Set payment status
        if (participant.payment_status === "paid") {
            paymentStatus.innerHTML = '<span class="status-paid"><i class="fas fa-check-circle"></i> Paid</span>';
        } else {
            paymentStatus.innerHTML = '<span class="status-pending"><i class="fas fa-clock"></i> Payment Pending</span>';
        }

        // Set attendance status
        if (participant.attended) {
            statusIndicator.classList.add("status-verified");
            statusText.textContent = "Attended";
        } else {
            statusIndicator.classList.add("status-new");
            statusText.textContent = "New Registration";
        }
        
        // Set events list
        eventsList.innerHTML = '';
        participant.events.forEach(event => {
            const eventBadge = document.createElement("span");
            eventBadge.classList.add("event-badge");
            eventBadge.textContent = formatEventName(event);
            eventsList.appendChild(eventBadge);
        });

        // Show the result container
        resultContainer.classList.remove("hidden");
    }

    // Show error in the result container
    function showError(title, message) {
        ticketId.textContent = "Error";
        scanTime.textContent = new Date().toLocaleString();
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
        
        // Show the result container
        resultContainer.classList.remove("hidden");
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
});