document.addEventListener('DOMContentLoaded', async () => {
    /* ---------- Base URL for backend API ---------- */
    const API_BASE_URL = 'https://webfinalproject-server.onrender.com';

    /* ---------- DOM elements references ---------- */
    const backButton = document.querySelector('.reports-title .back-arrow').closest('a');
    const homeButton = document.querySelector('.thank-you-footer button');
    const displayFaultType = document.getElementById('displayFaultType');
    const displayLocation = document.getElementById('displayLocation');
    const displayDate = document.getElementById('displayDate');
    const displayTime = document.getElementById('displayTime');
    const displayDescription = document.getElementById('displayDescription');
    const mediaContainer = document.getElementById('displayMedia');
    const displayStatus = document.getElementById('displayStatus');
    const displayResponse = document.getElementById('displayMunicipalityResponse');

    /* ---------- Helper function to get address from coordinates via API ---------- */
    const getAddressFromCoordinates = async (lat, lon) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/reverse-geocode?lat=${lat}&lon=${lon}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error decoding location:', error);
            return null; /* ---------- Return null on failure to avoid blocking UI ---------- */
        }
    };

    /* ---------- Utility to parse URL parameters ---------- */
    function getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        const results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    /* ---------- Fetch report details from backend API ---------- */
    async function fetchReportDetails(reportId) {
        try {
            const url = `${API_BASE_URL}/api/reports/${reportId}`;
            const res = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to retrieve report details.');
            }

            const report = await res.json();
            console.log('Report details successfully loaded:', report);
            return report;
        } catch (error) {
            console.error('Error retrieving report details:', error);
            alert('אירעה שגיאה באחזור פרטי הדיווח. אנא נסה שוב מאוחר יותר.');
            return null; /* ---------- Return null to handle failure gracefully ---------- */
        }
    }

    /* ---------- Populate the UI with report data ---------- */
    async function displayReportDetails(report) {
        if (!report) {
            console.warn('No details found for this report.');
            return;
        }
        displayFaultType.textContent = report.faultType || 'לא זמין';
        displayDescription.textContent = report.faultDescription || 'אין תיאור';

        /* ---------- Handle location display for manual or GPS based ---------- */
        if (report.location) {
            if (report.location.type === 'manual') {
                const city = report.location.city || '';
                const street = report.location.street || '';
                const houseNumber = report.location.houseNumber || '';
                const address = `${city}, ${street}${houseNumber ? ' ' + houseNumber : ''}`;
                displayLocation.textContent = address;
            } else if (report.location.type === 'current') {
                const { latitude, longitude } = report.location;
                const addressData = await getAddressFromCoordinates(latitude, longitude);
                if (addressData) {
                    const city = addressData.city || addressData.town || addressData.village || '';
                    const street = addressData.road || '';
                    const houseNumber = addressData.house_number || '';
                    const formattedLocation = `${city}, ${street}${houseNumber ? ' ' + houseNumber : ''}`.trim();
                    displayLocation.textContent = formattedLocation;
                } else {
                    displayLocation.textContent = 'מיקום לפי GPS';
                }
            } else {
                displayLocation.textContent = 'מיקום לא ידוע';
            }
        } else {
            displayLocation.textContent = 'מיקום לא ידוע';
        }

        /* ---------- Format and display date and time ---------- */
        const timestamp = report.timestamp ? new Date(report.timestamp) : null;
        displayDate.textContent = timestamp ? timestamp.toLocaleDateString('he-IL') : 'לא ידוע';
        displayTime.textContent = timestamp ? timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : 'לא ידוע';

        /* ---------- Translate and style status ---------- */
        let statusText = '';
        let statusClass = '';
        switch (report.status) {
            case 'in-progress':
                statusText = 'בטיפול';
                statusClass = 'status-in-progress';
                break;
            case 'completed':
                statusText = 'הושלם';
                statusClass = 'status-paid';
                break;
            case 'rejected':
                statusText = 'נדחה';
                statusClass = 'status-rejected';
                break;
            default:
                statusText = report.status || 'לא ידוע';
                statusClass = 'status-in-progress';
                break;
        }
        displayStatus.textContent = statusText;
        displayStatus.classList.add(statusClass);

        /* ---------- Municipality response or fallback ---------- */
        displayResponse.textContent = report.municipalityResponse || 'טרם התקבלה תגובה';

        /* ---------- Display media (image or video) if available ---------- */
        if (report.media && report.mediaMimeType) {
            const mediaUrl = `${API_BASE_URL}/api/media/${report.media}`;
            const mimeType = report.mediaMimeType;
            let mediaElement;
            if (mimeType.startsWith('image/')) {
                mediaElement = document.createElement('img');
                mediaElement.src = mediaUrl;
                mediaElement.alt = 'תמונת דיווח';
                mediaElement.classList.add('detail-media');
            } else if (mimeType.startsWith('video/')) {
                mediaElement = document.createElement('video');
                mediaElement.src = mediaUrl;
                mediaElement.controls = true;
                mediaElement.classList.add('detail-media');
            }
            if (mediaElement) {
                mediaContainer.innerHTML = '';
                mediaContainer.appendChild(mediaElement);
            } else {
                mediaContainer.textContent = 'פורמט מדיה לא נתמך';
            }
        } else {
            mediaContainer.textContent = 'אין מדיה מצורפת';
        }
    }

    /* ---------- Main logic flow ---------- */
    const reportId = getUrlParameter('id');
    if (reportId) {
        const reportDetails = await fetchReportDetails(reportId);
        await displayReportDetails(reportDetails);
    } else {
        console.error('Report ID not found in URL.');
        alert('שגיאה: מזהה דיווח חסר. אנא חזור לדף הדיווחים.');
    }

    /* ---------- Event handlers for navigation buttons ---------- */
    if (backButton) {
        backButton.addEventListener('click', (event) => {
            event.preventDefault();
            window.history.back();
        });
    }
    if (homeButton) {
        homeButton.addEventListener('click', () => {
            window.location.href = '/html/homePageCitizen.html';
        });
    }

    console.log('reportingDetailsPage.js fully loaded.');
});
