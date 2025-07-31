document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logoutButton');
    const userProfileDisplay = document.getElementById('userProfileDisplay');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const deleteProfileButton = document.getElementById('deleteProfileButton');
    const API_BASE_URL = 'https://webfinalproject-server.onrender.com';

    /* ---------- Update user profile type display ---------- */
    function updateUserProfileText() {
        const userProfileType = localStorage.getItem('selectedUserType');
        console.log('Fetched user profile type:', userProfileType);

        if (userProfileDisplay) {
            let displayText = 'מחובר כ-אורח';
            if (userProfileType === 'citizen') {
                displayText = 'מחובר כ-אזרח';
            } else if (userProfileType === 'employee') {
                displayText = 'מחובר כ-עובד';
            }
            userProfileDisplay.textContent = displayText;
        }
    }

    /* ---------- Update user name display ---------- */
    function updateUserName() {
        const userName = localStorage.getItem('loggedInUserName');
        console.log('Fetched user name:', userName);

        if (userNameDisplay) {
            userNameDisplay.textContent = userName || 'אורח';
        }
    }

    updateUserProfileText();
    updateUserName();

    /* ---------- Logout functionality ---------- */
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('selectedUserType');
            localStorage.removeItem('loggedInUserId');
            localStorage.removeItem('loggedInUserName');
            window.location.href = '../index.html';
        });
    }

    /* ---------- Delete profile functionality ---------- */
    if (deleteProfileButton) {
        deleteProfileButton.addEventListener('click', async (event) => {
            event.preventDefault();

            const confirmDelete = confirm('האם אתה בטוח שברצונך למחוק את חשבונך וכל התקלות שדיווחת? פעולה זו בלתי הפיכה!');

            if (confirmDelete) {
                const userId = localStorage.getItem('loggedInUserId');

                if (!userId) {
                    alert('שגיאה: לא ניתן למצוא את מזהה המשתמש. אנא התחבר שוב.');
                    return;
                }

                try {
                    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    if (response.ok) {
                        alert('החשבון וכל הדיווחים הקשורים נמחקו בהצלחה.');
                        localStorage.removeItem('selectedUserType');
                        localStorage.removeItem('loggedInUserName');
                        localStorage.removeItem('loggedInUserId');
                        localStorage.removeItem('loggedInUserCity');
                        window.location.href = '../index.html';
                    } else {
                        const errorData = await response.json();
                        alert(`שגיאה במחיקת החשבון: ${errorData.message || 'נסה שוב מאוחר יותר.'}`);
                    }
                } catch (error) {
                    console.error('Error while sending delete request:', error);
                    alert('אירעה שגיאה בעת ניסיון מחיקת החשבון. אנא נסה שוב מאוחר יותר.');
                }
            }
        });
    }
});
