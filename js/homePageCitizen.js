/* ---------- Wait for the DOM to fully load ---------- */
document.addEventListener('DOMContentLoaded', () => {
    const newReportButton = document.getElementById('newReportButton');
    const myReportsButton = document.getElementById('myReportsButton');
    const profileButton = document.getElementById('profileButton');
    
    /* ---------- Attach click event to 'New Report' button ---------- */
    if (newReportButton) {
        newReportButton.addEventListener('click', () => {
            window.location.href = '../html/newReportPage.html'; 
        });
    } else {
        console.warn("Element with ID 'newReportButton' not found. Cannot attach click listener.");
    }

    /* ---------- Attach click event to 'My Reports' button ---------- */
    if (myReportsButton) {
        myReportsButton.addEventListener('click', () => {
            window.location.href = '../html/myReportsPage.html'; 
        });
    } else {
        console.warn("Element with ID 'myReportsButton' not found. Cannot attach click listener.");
    }

    /* ---------- Attach click event to 'Profile' button ---------- */
    if (profileButton) {
        profileButton.addEventListener('click', () => {
            window.location.href = '../html/profilePage.html'; 
        });
    } else {
        console.warn("Element with ID 'profileButton' not found. Cannot attach click listener.");
    }
});
