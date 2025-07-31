document.addEventListener('DOMContentLoaded', async () => {
    const BASE_URL = 'https://webfinalproject-server.onrender.com';

    const urlParams = new URLSearchParams(window.location.search);
    const reportId  = urlParams.get('id');

    /* ---------- DOM Elements ---------- */
    const reportsTitleElement   = document.querySelector('.reports-title h1');
    const reportNumberDisplayElement = document.getElementById('reportNumberDisplay');
    const backButton            = document.getElementById('backButton');
    const displayFaultType      = document.getElementById('displayFaultType');
    const displayLocation       = document.getElementById('displayLocation');
    const displayDate           = document.getElementById('displayDate');
    const displayTime           = document.getElementById('displayTime');
    const displayDescription    = document.getElementById('displayDescription');
    const mediaContainer        = document.getElementById('mediaContainer');
    const editStatus            = document.getElementById('editStatus');  // זה עכשיו ה-DIV של custom-select
    const editMunicipalityResponse = document.getElementById('editMunicipalityResponse');
    const saveChangesButton     = document.getElementById('saveChangesButton');
    const cancelChangesButton   = document.getElementById('cancelChangesButton');
    let currentReport = null; 

    /* ---------- Status mapping ---------- */
    const statusTranslations = {
        'in-progress': 'בטיפול',
        'completed'  : 'הושלם',
        'rejected'   : 'נדחה',
    };

    /* ---------- Utils ---------- */
    function getLoggedInUser() {
        const user = localStorage.getItem('loggedInUser');
        return user ? JSON.parse(user) : null;
    }

    /* ---------- API Calls ---------- */
    async function fetchReportDetails(id) {
        try {
            const response = await fetch(`${BASE_URL}/api/reports/${id}`);
            if (!response.ok) {
                if (response.status === 404) throw new Error('דיווח לא נמצא.');
                throw new Error(`שגיאה בשליפת דיווח: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching report:', error);
            alert('אירעה שגיאה בטעינת פרטי הדיווח.');
            return null;
        }
    }

    async function updateReport(id, updatedData) {
        try {
            const response = await fetch(`${BASE_URL}/api/reports/${id}`, {
                method : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify(updatedData)
            });
            if (!response.ok) {
                const msg = (await response.json()).message || response.statusText;
                throw new Error(msg);
            }
            return await response.json();
        } catch (error) {
            console.error('Error updating report:', error);
            alert('אירעה שגיאה בשמירת השינויים: ' + error.message);
            return null;
        }
    }

    /* ---------- Load status options into custom select ---------- */
    async function loadStatusOptions() {
        try {
            const response = await fetch(`${BASE_URL}/api/status-options`);
            if (!response.ok) throw new Error('שגיאה בטעינת סטטוסים מהשרת');

            const statuses = await response.json();

            const selectedDiv = editStatus.querySelector('.selected');
            const optionsList = editStatus.querySelector('.options');

            optionsList.innerHTML = ''; // נקה את הרשימה

            statuses.forEach(status => {
                const li = document.createElement('li');
                li.textContent = status.name;
                li.dataset.value = status.value; // ערך פנימי
                optionsList.appendChild(li);
            });

            // בחר את הסטטוס הנוכחי אם קיים בדיווח
            if (currentReport && currentReport.status) {
                const normalizedStatus = currentReport.status.toLowerCase().replace(/_/g, '-');
                const selectedStatus = statuses.find(s => s.value === normalizedStatus);
                if (selectedStatus) {
                    selectedDiv.textContent = selectedStatus.name;
                    // מסמן את האופציה הנבחרת
                    optionsList.querySelectorAll('li').forEach(li => {
                        li.classList.toggle('selected', li.dataset.value === normalizedStatus);
                    });
                    editStatus.dataset.value = normalizedStatus;
                }
            } else {
                selectedDiv.textContent = 'בחר סטטוס';
                editStatus.dataset.value = '';
            }

            // אירוע פתיחה וסגירה של הרשימה
            editStatus.addEventListener('click', () => {
                editStatus.classList.toggle('open');
                const expanded = editStatus.classList.contains('open');
                editStatus.setAttribute('aria-expanded', expanded);
            });

            // אירוע בחירת אופציה
            optionsList.querySelectorAll('li').forEach(li => {
                li.addEventListener('click', () => {
                    e.stopPropagation();
                    selectedDiv.textContent = li.textContent;
                    editStatus.dataset.value = li.dataset.value;
                    optionsList.querySelectorAll('li').forEach(item => item.classList.remove('selected'));
                    li.classList.add('selected');
                    editStatus.classList.remove('open');
                    editStatus.setAttribute('aria-expanded', 'false');
                });
            });

            // סגירת הרשימה בלחיצה מחוץ
            document.addEventListener('click', e => {
                if (!editStatus.contains(e.target)) {
                    editStatus.classList.remove('open');
                    editStatus.setAttribute('aria-expanded', 'false');
                }
            });

        } catch (err) {
            console.error('שגיאה בטעינת סטטוסים:', err);
            const optionsList = editStatus.querySelector('.options');
            optionsList.innerHTML = '<li>שגיאה בטעינה</li>';
        }
    }

    /* ---------- Populate report data ---------- */
    async function populateReportData(report) {
        displayFaultType.textContent = report.faultType || 'לא ידוע';

        let locationText = '';
        if (report.location) {
            if (report.location.type === 'manual') {
                if (report.location.city)        locationText += report.location.city;
                if (report.location.street)      locationText += `, ${report.location.street}`;
                if (report.location.houseNumber) locationText += ` ${report.location.houseNumber}`;
                displayLocation.textContent = locationText || 'לא הוזן מיקום';
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
                            displayLocation.textContent = locationText || 'מיקום לפי GPS';
                        } else {
                            displayLocation.textContent = 'מיקום לפי GPS';
                        }
                    } catch (err) {
                        console.error('שגיאה ב-reverse geocode:', err);
                        displayLocation.textContent = 'מיקום לפי GPS';
                    }
                } else {
                    displayLocation.textContent = 'מיקום לפי GPS';
                }
            } else {
                displayLocation.textContent = 'סוג מיקום לא נתמך';
            }
        } else {
            displayLocation.textContent = 'לא הוזן מיקום';
        }

        if (report.timestamp) {
            const date = new Date(report.timestamp);
            displayDate.textContent = date.toLocaleDateString('he-IL');
            displayTime.textContent = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        } else {
            displayDate.textContent = 'לא ידוע';
            displayTime.textContent = 'לא ידוע';
        }

        displayDescription.textContent = report.faultDescription || 'אין תיאור';

        mediaContainer.innerHTML = '';
        if (report.media) {
            const mediaUrl = `${BASE_URL}/api/media/${report.media}`;
            try {
                const headResponse = await fetch(mediaUrl, { method: 'HEAD' });
                if (!headResponse.ok) throw new Error('שגיאה בקבלת מידע על המדיה');
                const contentType = headResponse.headers.get('Content-Type') || '';
                if (contentType.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = mediaUrl;
                    img.alt = 'תמונה מצורפת לדיווח';
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
                    mediaContainer.textContent = 'קובץ מדיה לא נתמך.';
                }
            } catch (err) {
                console.error('Error loading media:', err);
                mediaContainer.textContent = 'שגיאה בטעינת המדיה.';
            }
        } else {
            mediaContainer.textContent = 'אין מדיה מצורפת.';
        }

        // עדכון תצוגת סטטוס בעברית (להראות בתצוגה, לא לעריכה)
        const normalizedStatus = (report.status || '').toLowerCase().replace(/_/g, '-');
        const statusHebrew     = statusTranslations[normalizedStatus] || 'לא ידוע';
        const displayStatus = document.getElementById('displayStatus');
        if (displayStatus) {
            displayStatus.textContent = statusHebrew;
            displayStatus.classList.remove('status-paid', 'status-rejected', 'status-in-progress');
            if (normalizedStatus === 'completed') displayStatus.classList.add('status-paid');
            if (normalizedStatus === 'rejected')  displayStatus.classList.add('status-rejected');
            if (normalizedStatus === 'in-progress') displayStatus.classList.add('status-in-progress');
        }

        const displayMunicipalityResponse = document.getElementById('displayMunicipalityResponse');
        if (displayMunicipalityResponse) {
            displayMunicipalityResponse.textContent =
                report.municipalityResponse || 'טרם התקבלה תגובה מהרשות המקומית.';
        }

        // לא משנים את editStatus כאן כי הוא נטען אחרי בפונקציה loadStatusOptions
        if (editMunicipalityResponse) editMunicipalityResponse.value = report.municipalityResponse || '';
    }

    if (!reportId) {
        reportsTitleElement.textContent = 'שגיאה: ID דיווח חסר';
        console.error('Report ID is missing from the URL.');
        return;
    }

    if (reportNumberDisplayElement) {
        reportNumberDisplayElement.textContent = `${reportId.slice(-4)}`;
    }

    const user = getLoggedInUser();
    if (saveChangesButton && (!user || user.userType !== 'employee')) {
        alert('אין לך הרשאה לערוך דיווחים.');
        window.location.href = '../html/login.html';
        return;
    }

    currentReport = await fetchReportDetails(reportId);
    if (currentReport) {
        await populateReportData(currentReport);
        await loadStatusOptions();
    } else {
        reportsTitleElement.textContent = 'שגיאה בטעינת דיווח';
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.innerHTML = '<p style="color:red;text-align:center;">הדיווח לא נמצא או אירעה שגיאה בטעינה.</p>';
        }
        if (saveChangesButton)   saveChangesButton.style.display   = 'none';
        if (cancelChangesButton) cancelChangesButton.style.display = 'none';
    }

    if (saveChangesButton) {
        saveChangesButton.addEventListener('click', async () => {
            // במקום editStatus.value משתמשים בערך השמור ב-dataset.value
            const selectedValue = editStatus.dataset.value || 'in-progress';
            const updatedData = {
                status: selectedValue,
                municipalityResponse: editMunicipalityResponse.value
            };
            const result = await updateReport(reportId, updatedData);
            if (result) {
                alert('השינויים נשמרו בהצלחה!');
                window.location.href = `/html/finalReportPage.html?id=${reportId}`;
            }
        });
    }

    if (cancelChangesButton) {
        cancelChangesButton.addEventListener('click', () => {
            if (currentReport) populateReportData(currentReport);
            alert('השינויים בוטלו.');
            window.history.back();
        });
    }

    if (backButton) {
        backButton.addEventListener('click', () => window.history.back());
    }
});