document.addEventListener('DOMContentLoaded', async () => {
    const reportsDisplayArea = document.getElementById('reports-display-area');
    const filterButtons = document.querySelectorAll('.filter-button');
    const customSortSelect = document.getElementById('sortReportsDropdown'); // custom select שלך
    const backButton = document.getElementById('backButton');
    let allReports = [];
    let currentFilter = 'all';
    let currentSort = 'date-default';
    function getLoggedInUser() {
        const user = localStorage.getItem('loggedInUser');
        return user ? JSON.parse(user) : null;
    }

    async function fetchReports(city, status = 'all') {
        try {
            const BASE_URL = 'https://webfinalproject-server.onrender.com';
            let url = `${BASE_URL}/api/employee-reports?city=${encodeURIComponent(city)}`;
            if (status !== 'all') {
                url += `&status=${encodeURIComponent(status)}`;
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error((await res.json()).message || 'Failed to fetch reports');
            return res.json();
        } catch (err) {
            console.error('Error fetching reports:', err);
            alert('אירעה שגיאה בטעינת הדיווחים.');
            return [];
        }
    }

    function sortReports(reportsArr) {
        const arr = [...reportsArr];
        if (currentSort === 'alphabetical') {
            arr.sort((a, b) => a.faultType.localeCompare(b.faultType, 'he'));
        }
        return arr;
    }

    function createReportCard(report) {
        const card = document.createElement('section');
        card.classList.add('report-summary-card');
        const displayId = report._id.slice(-4);
        card.innerHTML = `
            <section class="report-info">
                <span class="report-id-word">דיווח #</span>
                <span class="report-id-type">${displayId}
                <span class="report-type-name">${report.faultType}</span></span>
            </section>
            <a href="/html/reportEditPage.html?id=${report._id}&seq=${displayId}" class="view-details-link">צפייה בפרטים</a>
        `;
        return card;
    }

    function displayReports(reportsArr) {
        reportsDisplayArea.innerHTML = '';
        const sorted = sortReports(reportsArr);
        if (!sorted.length) {
            const p = document.createElement('p');
            p.textContent = 'אין דיווחים רלוונטיים להצגה.';
            p.style.textAlign = 'center';
            p.style.marginTop = '20px';
            p.style.fontSize = '40px';
            reportsDisplayArea.appendChild(p);
            return;
        }
        sorted.forEach(r => reportsDisplayArea.appendChild(createReportCard(r)));
    }

    function handleSortChange(newSort) {
        currentSort = newSort;

        // עדכון הטקסט והערך של ה-selected div ב-custom-select
        if (customSortSelect) {
            const selectedDiv = customSortSelect.querySelector('.selected');
            const optionsList = customSortSelect.querySelectorAll('li');

            optionsList.forEach(li => {
                if (li.dataset.value === currentSort) {
                    li.classList.add('selected');
                    selectedDiv.textContent = li.textContent;
                    selectedDiv.dataset.value = li.dataset.value;
                } else {
                    li.classList.remove('selected');
                }
            });

            // סגירת הרשימה לאחר הבחירה
            customSortSelect.setAttribute('aria-expanded', 'false');
            customSortSelect.classList.remove('open');
            const ulOptions = customSortSelect.querySelector('.options');
            if (ulOptions) ulOptions.style.display = 'none';
        }

        displayReports(allReports);
    }

    // טיפול בפתיחה וסגירה של ה-custom-select
    if (customSortSelect) {
        const selectedDiv = customSortSelect.querySelector('.selected');
        const optionsList = customSortSelect.querySelector('.options');

        // אתחול סגירת הרשימה
        optionsList.style.display = 'none';
        customSortSelect.setAttribute('aria-expanded', 'false');

        customSortSelect.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = customSortSelect.classList.contains('open');
            if (isOpen) {
                // סגור את הרשימה
                customSortSelect.classList.remove('open');
                customSortSelect.setAttribute('aria-expanded', 'false');
                optionsList.style.display = 'none';
            } else {
                // סגור קודם את כל הרשימות הפתוחות
                closeAllCustomSelects();
                // פתח את הרשימה
                customSortSelect.classList.add('open');
                customSortSelect.setAttribute('aria-expanded', 'true');
                optionsList.style.display = 'block';
            }
        });

        // בחירת פריט מהרשימה
        optionsList.querySelectorAll('li').forEach(li => {
            li.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedDiv.textContent = li.textContent;
                selectedDiv.dataset.value = li.dataset.value;

                // סגור את הרשימה
                customSortSelect.classList.remove('open');
                customSortSelect.setAttribute('aria-expanded', 'false');
                optionsList.style.display = 'none';

                // עדכן מיון
                handleSortChange(li.dataset.value);
            });
        });

        // פונקציה לסגירת כל הרשימות הפתוחות
        function closeAllCustomSelects() {
            document.querySelectorAll('.custom-select.open').forEach(sel => {
                sel.classList.remove('open');
                sel.setAttribute('aria-expanded', 'false');
                const ul = sel.querySelector('.options');
                if (ul) ul.style.display = 'none';
            });
        }

        // סגור את הרשימה בלחיצה מחוץ
        document.addEventListener('click', () => {
            closeAllCustomSelects();
        });
    }

    const user = getLoggedInUser();
    if (!user || user.userType !== 'employee' || !user.city) {
        alert('עליך להיות מחובר כעובד עם עיר כדי לצפות בדיווחים.');
        window.location.href = '../html/login.html';
        return;
    }

    allReports = await fetchReports(user.city, currentFilter);
    displayReports(allReports);

    filterButtons.forEach(btn => btn.addEventListener('click', async (evt) => {
        filterButtons.forEach(b => b.classList.remove('active'));
        evt.target.classList.add('active');
        currentFilter = evt.target.dataset.filter || 'all';
        allReports = await fetchReports(user.city, currentFilter);
        displayReports(allReports);
    }));

    if (backButton) {
        backButton.addEventListener('click', e => {
            e.preventDefault();
            window.history.back();
        });
    }
});