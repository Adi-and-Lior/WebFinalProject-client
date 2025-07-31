document.addEventListener('DOMContentLoaded', async () => {

/* ---------- Define base URL ---------- */
const BASE_URL = 'https://webfinalproject-server.onrender.com';

/* ---------- Fetch Report ID from URL ---------- */
const urlParams = new URLSearchParams(window.location.search);
const reportId  = urlParams.get('id');

/* ---------- DOM Elements ---------- */
const reportsTitleElement        = document.querySelector('.reports-title h1');
const reportNumberDisplayElement = document.getElementById('reportNumberDisplay');
const backToHomeButton           = document.getElementById('backToHomeButton');
const displayFaultType           = document.getElementById('displayFaultType');
const displayLocation            = document.getElementById('displayLocation');
const displayDate                = document.getElementById('displayDate');
const displayTime                = document.getElementById('displayTime');
const displayDescription         = document.getElementById('displayDescription');
const mediaContainer             = document.getElementById('mediaContainer');
const displayStatus              = document.getElementById('displayStatus');
const displayMunicipalityResponse = document.getElementById('displayMunicipalityResponse');

/* ---------- Status translations ---------- */
const statusTranslations = {
    'in-progress': 'בטיפול',
    'completed'  : 'הושלם',
    'rejected'   : 'נדחה',
};

/* ---------- Fetch details of a specific report from API ---------- */
async function fetchReportDetails(id) {
    try {
        const response = await fetch(`${BASE_URL}/api/reports/${id}`);
        if (!response.ok) {
            if (response.status === 404) throw new Error('Report not found.');
            throw new Error(`Error fetching report: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching report:', error);
        alert('אירעה שגיאה בטעינת פרטי הדיווח.');
        return null;
    }
}

/* ---------- Populate HTML elements with fetched report data ---------- */
async function populateReportData(report) {
    displayFaultType.textContent = report.faultType || 'Unknown';

    /* ---------- Display location based on type ---------- */
    let locationText = '';
    if (report.location) {
        if (report.location.type === 'manual') {
            if (report.location.city)         locationText += report.location.city;
            if (report.location.street)       locationText += `, ${report.location.street}`;
            if (report.location.houseNumber) locationText += ` ${report.location.houseNumber}`;
            displayLocation.textContent = locationText || 'No location provided';
        } else if (report.location.type === 'current') {
            const lat = report.location.latitude;
            const lon = report.location.longitude;
            if (lat != null && lon != null) {
                try {
                    const geoRes = await fetch(`${BASE_URL}/api/reverse-geocode?lat=${lat}&lon=${lon}`);
                    if (geoRes.ok) {
                        const geoData = await geoRes.json();
                        const city = geoData.city || geoData.town || geoData.village || '';
                        const street = geoData.road || '';
                        const houseNumber = geoData.house_number || '';
                        locationText = `${city}, ${street}${houseNumber ? ' ' + houseNumber : ''}`;
                        displayLocation.textContent = locationText || 'Location from GPS';
                    } else {
                        displayLocation.textContent = 'Location from GPS';
                    }
                } catch (err) {
                    console.error('Error in reverse geocode:', err);
                    displayLocation.textContent = 'Location from GPS';
                }
            } else {
                displayLocation.textContent = 'Location from GPS';
            }
        } else {
            displayLocation.textContent = 'Unsupported location type';
        }
    } else {
        displayLocation.textContent = 'No location provided';
    }

    /* ---------- Display date and time ---------- */
    if (report.timestamp) {
        const date = new Date(report.timestamp);
        displayDate.textContent = date.toLocaleDateString('he-IL');
        displayTime.textContent = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    } else {
        displayDate.textContent = 'Unknown';
        displayTime.textContent  = 'Unknown';
    }

    displayDescription.textContent = report.faultDescription || 'No description provided';

    /* ---------- Display media (image/video) based on content type ---------- */
    mediaContainer.innerHTML = '';
    if (report.media) {
        const mediaUrl = `${BASE_URL}/api/media/${report.media}`;
        try {
            const headResponse = await fetch(mediaUrl, { method: 'HEAD' });
            if (!headResponse.ok) throw new Error('Error getting media info');
            const contentType = headResponse.headers.get('Content-Type') || '';
            if (contentType.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = mediaUrl;
                img.alt = 'Attached report image';
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                mediaContainer.appendChild(img);
            } else if (contentType.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = mediaUrl;
                video.controls = true;
                video.style.maxWidth = '100%';
                video.style.height = 'auto';
                mediaContainer.appendChild(video);
            } else {
                mediaContainer.textContent = 'Unsupported media file.';
            }
        } catch (error) {
            console.error('Error loading media:', error);
            mediaContainer.textContent = 'Error loading media.';
        }
    }

    /* ---------- Display status with styling ---------- */
    const normalizedStatus = (report.status || '').toLowerCase().replace(/_/g, '-');
    const statusHebrew     = statusTranslations[normalizedStatus] || 'Unknown';
    if (displayStatus) {
        displayStatus.textContent = statusHebrew;
        displayStatus.classList.remove('status-paid', 'status-rejected', 'status-in-progress');
        if (normalizedStatus === 'completed')   displayStatus.classList.add('status-paid');
        if (normalizedStatus === 'rejected')    displayStatus.classList.add('status-rejected');
        if (normalizedStatus === 'in-progress') displayStatus.classList.add('status-in-progress');
    }

    /* ---------- Display municipality response ---------- */
    displayMunicipalityResponse.textContent =
        report.municipalityResponse || 'טרם התקבלה תגובה מהרשות המקומית.';
}

/* ---------- Check if report ID exists ---------- */
if (!reportId) {
    reportsTitleElement.textContent = 'Error: Missing report ID';
    console.error('Report ID is missing from the URL.');
    return;
}

/* ---------- Load report details ---------- */
const currentReport = await fetchReportDetails(reportId);
if (currentReport) {
    if (reportNumberDisplayElement) {
        reportNumberDisplayElement.textContent = `${reportId.slice(-4)}`;
    }
    populateReportData(currentReport);
} else {
    reportsTitleElement.textContent = 'Error loading report';
    document.querySelector('main').innerHTML =
        `<p style="color:red;text-align:center;">Report not found or error occurred during loading.</p>`;
    if (backToHomeButton) backToHomeButton.style.display = 'none';
}

/* ---------- Event listener for home button ---------- */
if (backToHomeButton) {
    backToHomeButton.addEventListener('click', () =>
        window.location.href = '../html/homePageEmployee.html'
    );
}
});
