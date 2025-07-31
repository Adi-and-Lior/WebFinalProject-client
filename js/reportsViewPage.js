document.addEventListener('DOMContentLoaded', async () => {
    /* ---------- Cache main elements ---------- */
    const reportsDisplayArea = document.getElementById('reports-display-area');
    const filterButtons = document.querySelectorAll('.filter-button');
    const customSortSelect = document.getElementById('sortReportsDropdown'); // Custom select element
    const backButton = document.getElementById('backButton');
    let allReports = [];
    let currentFilter = 'all';
    let currentSort = 'date-default';

    /* ---------- Get currently logged-in user from localStorage ---------- */
    function getLoggedInUser() {
        const user = localStorage.getItem('loggedInUser');
        return user ? JSON.parse(user) : null;
    }

    /* ---------- Fetch reports from server filtered by city and optionally status ---------- */
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

    /* ---------- Sort reports array based on current sort setting ---------- */
    function sortReports(reportsArr) {
        const arr = [...reportsArr];
        if (currentSort === 'alphabetical') {
            arr.sort((a, b) => a.faultType.localeCompare(b.faultType, 'he'));
        }
        // Add other sort options if needed
        return arr;
    }

    /* ---------- Create a report card DOM element for display ---------- */
    function createReportCard(report) {
        const card = document.createElement('section');
        card.classList.add('report-summary-card');
        const displayId = report._id.slice(-4); // Last 4 chars of report ID
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

    /* ---------- Display reports in the page ---------- */
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

    /* ---------- Handle changes in sorting selection ---------- */
    function handleSortChange(newSort) {
        currentSort = newSort;

        // Update the custom-select UI selected item
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

            // Close the options list after selection
            customSortSelect.setAttribute('aria-expanded', 'false');
            customSortSelect.classList.remove('open');
            const ulOptions = customSortSelect.querySelector('.options');
            if (ulOptions) ulOptions.style.display = 'none';
        }

        displayReports(allReports);
    }

    /* ---------- Setup custom select dropdown behavior ---------- */
    if (customSortSelect) {
        const selectedDiv = customSortSelect.querySelector('.selected');
        const optionsList = customSortSelect.querySelector('.options');

        // Initialize dropdown closed
        optionsList.style.display = 'none';
        customSortSelect.setAttribute('aria-expanded', 'false');

        customSortSelect.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = customSortSelect.classList.contains('open');
            if (isOpen) {
                // Close dropdown
                customSortSelect.classList.remove('open');
                customSortSelect.setAttribute('aria-expanded', 'false');
                optionsList.style.display = 'none';
            } else {
                // Close all others before opening
                closeAllCustomSelects();
                customSortSelect.classList.add('open');
                customSortSelect.setAttribute('aria-expanded', 'true');
                optionsList.style.display = 'block';
            }
        });

        // Handle option selection
        optionsList.querySelectorAll('li').forEach(li => {
            li.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedDiv.textContent = li.textContent;
                selectedDiv.dataset.value = li.dataset.value;

                // Close dropdown
                customSortSelect.classList.remove('open');
                customSortSelect.setAttribute('aria-expanded', 'false');
                optionsList.style.display = 'none';

                // Update sorting
                handleSortChange(li.dataset.value);
            });
        });

        // Close all custom selects helper
        function closeAllCustomSelects() {
            document.querySelectorAll('.custom-select.open').forEach(sel => {
                sel.classList.remove('open');
                sel.setAttribute('aria-expanded', 'false');
                const ul = sel.querySelector('.options');
                if (ul) ul.style.display = 'none';
            });
        }

        // Close dropdown on outside click
        document.addEventListener('click', () => {
            closeAllCustomSelects();
        });
    }

    /* ---------- Verify user is logged in as employee with city ---------- */
    const user = getLoggedInUser();
    if (!user || user.userType !== 'employee' || !user.city) {
        alert('עליך להיות מחובר כעובד עם עיר כדי לצפות בדיווחים.');
        window.location.href = '../html/login.html';
        return;
    }

    /* ---------- Fetch and display initial reports ---------- */
    allReports = await fetchReports(user.city, currentFilter);
    displayReports(allReports);

    /* ---------- Setup filter buttons event listeners ---------- */
    filterButtons.forEach(btn => btn.addEventListener('click', async (evt) => {
        filterButtons.forEach(b => b.classList.remove('active'));
        evt.target.classList.add('active');
        currentFilter = evt.target.dataset.filter || 'all';
        allReports = await fetchReports(user.city, currentFilter);
        displayReports(allReports);
    }));

    /* ---------- Back button to go to previous page ---------- */
    if (backButton) {
        backButton.addEventListener('click', e => {
            e.preventDefault();
            window.history.back();
        });
    }
});
