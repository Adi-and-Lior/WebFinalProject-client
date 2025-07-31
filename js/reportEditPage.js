document.addEventListener('DOMContentLoaded', async () => {
    /* ---------- Extract report ID from URL parameters ---------- */
    const urlParams = new URLSearchParams(window.location.search);
    const reportId = urlParams.get('id');  
    
    /* ---------- Get references to DOM elements ---------- */
    const reportsTitleElement = document.querySelector('.reports-title h2');
    const backArrow = document.querySelector('.back-arrow');

    /* ---------- Check for missing report ID ---------- */
    if (!reportId) {
        reportsTitleElement.textContent = 'שגיאה: ID דיווח חסר';
        console.error('Report ID is missing from the URL.');
        return;
    }

    /* ---------- Show last 4 digits of the report ID ---------- */
    const reportNumberDisplayElement = document.getElementById('reportNumberDisplay');
    if (reportNumberDisplayElement) {
        reportNumberDisplayElement.textContent = `${reportId.slice(-4)}`;
    }

    /* ---------- Status translations for display ---------- */
    const statusTranslations = {
        'in-progress': 'בטיפול',
        'completed': 'הושלם',
        'rejected': 'נדחה',
    };

    const backendBaseUrl = 'https://webfinalproject-server.onrender.com';

    try {
        /* ---------- Fetch report details from backend ---------- */
        const response = await fetch(`${backendBaseUrl}/api/reports/${reportId}`);
        if (!response.ok) {
            if (response.status === 404) throw new Error('דיווח לא נמצא.');
            throw new Error(`שגיאה בשליפת דיווח: ${response.statusText}`);
        }
        const report = await response.json();
        console.log('Report details fetched:', report);

        /* ---------- Display fault type ---------- */
        document.getElementById('displayFaultType').textContent = report.faultType || 'לא ידוע';

        /* ---------- Handle and display location ---------- */
        if (report.location) {
            let locationText = '';

            if (report.location.type === 'manual') {
                if (report.location.city)        locationText += report.location.city;
                if (report.location.street)      locationText += `, ${report.location.street}`;
                if (report.location.houseNumber) locationText += ` ${report.location.houseNumber}`;
                document.getElementById('displayLocation').textContent = locationText || 'לא הוזן מיקום';
            } else if (report.location.type === 'current') {
                const lat = report.location.latitude;
                const lon = report.location.longitude;
                if (lat != null && lon != null) {
                    try {
                        /* ---------- Reverse geocode to get human-readable address ---------- */
                        const geoRes = await fetch(`${backendBaseUrl}/api/reverse-geocode?lat=${lat}&lon=${lon}`);
                        if (geoRes.ok) {
                            const geoData = await geoRes.json();
                            const city = geoData.city || geoData.town || geoData.village || '';
                            const street = geoData.road || '';
                            const houseNumber = geoData.house_number || '';
                            locationText = `${city}, ${street}${houseNumber ? ' ' + houseNumber : ''}`;
                            document.getElementById('displayLocation').textContent = locationText || 'מיקום לפי GPS';
                        } else {
                            document.getElementById('displayLocation').textContent = 'מיקום לפי GPS';
                        }
                    } catch (err) {
                        console.error('Error in reverse geocode:', err);
                        document.getElementById('displayLocation').textContent = 'מיקום לפי GPS';
                    }
                } else {
                    document.getElementById('displayLocation').textContent = 'מיקום לפי GPS';
                }
            } else {
                /* Unsupported location type */
                document.getElementById('displayLocation').textContent = 'סוג מיקום לא נתמך';
            }
        } else {
            document.getElementById('displayLocation').textContent = 'לא הוזן מיקום';
        }

        /* ---------- Display date and time ---------- */
        if (report.timestamp) {
            const dateObj = new Date(report.timestamp);
            document.getElementById('displayDate').textContent =
                dateObj.toLocaleDateString('he-IL');
            document.getElementById('displayTime').textContent =
                dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        } else {
            document.getElementById('displayDate').textContent  = 'לא ידוע';
            document.getElementById('displayTime').textContent  = 'לא ידוע';
        }

        /* ---------- Display fault description ---------- */
        document.getElementById('displayDescription').textContent =
            report.faultDescription || 'אין תיאור.';

        /* ---------- Display media (image/video) if exists ---------- */
        const mediaContainer = document.getElementById('mediaContainer');
        mediaContainer.innerHTML = '';
        console.log('Media filename:', report.media);

        if (report.media) {
            const mediaUrl = `${backendBaseUrl}/api/media/${report.media}`;
            try {
                const headResponse = await fetch(mediaUrl, { method: 'HEAD' });
                if (!headResponse.ok) throw new Error('שגיאה בקבלת מדיה');
                const contentType = headResponse.headers.get('Content-Type');
                console.log('Media Content-Type:', contentType);
                mediaContainer.innerHTML = ''; 
                if (contentType && contentType.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = mediaUrl;
                    img.alt = 'תמונה מצורפת לדיווח';
                    img.style.maxWidth = '100%';
                    mediaContainer.appendChild(img);
                } else if (contentType && contentType.startsWith('video/')) {
                    const video = document.createElement('video');
                    video.src = mediaUrl;
                    video.controls = true;
                    video.style.maxWidth = '100%';
                    mediaContainer.appendChild(video);
                } else {
                    mediaContainer.textContent = 'קובץ מדיה לא נתמך.';
                }
            } catch (err) {
                console.error('Error loading media:', err);
                mediaContainer.textContent = 'שגיאה בטעינת המדיה.';
            }
        } else {
            mediaContainer.textContent = 'אין מדיה מצורפת.';
        }

        /* ---------- Display status with Hebrew translation and styling ---------- */
        let normalizedStatus = (report.status || '').toLowerCase().replace(/_/g, '-');
        const statusHebrew = statusTranslations[normalizedStatus] || 'לא ידוע';
        const statusElement = document.getElementById('displayStatus');
        statusElement.textContent = statusHebrew;
        statusElement.classList.remove('status-paid', 'status-rejected', 'status-in-progress');
        if (normalizedStatus === 'completed') {
            statusElement.classList.add('status-paid');
        } else if (normalizedStatus === 'rejected') {
            statusElement.classList.add('status-rejected');
        } else if (normalizedStatus === 'in-progress') {
            statusElement.classList.add('status-in-progress');
        }

        /* ---------- Display municipality response ---------- */
        document.getElementById('displayMunicipalityResponse').textContent =
            report.municipalityResponse || 'טרם התקבלה תגובה מהרשות המקומית.';
    } catch (error) {
        /* ---------- Handle errors in fetching report ---------- */
        console.error('Error loading report details:', error);
        reportsTitleElement.textContent = 'שגיאה בטעינת דיווח';
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.innerHTML =
                `<p style="color:red;text-align:center;">${error.message}</p>`;
        }
    }

    /* ---------- Edit button navigation ---------- */
    const editPageButton = document.querySelector('.footer-employee button');
    if (editPageButton) {
        editPageButton.addEventListener('click', () => {
            window.location.href = `/html/reportChangePage.html?id=${reportId}`;
        });
    }

    /* ---------- Back arrow functionality ---------- */
    if (backArrow) {
        backArrow.addEventListener('click', evt => {
            evt.preventDefault();
            window.history.back();
        });
    }
});
