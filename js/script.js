document.addEventListener('DOMContentLoaded', () => {
    /* ---------- Cache profile option elements and continue button ---------- */
    const profileOptions = document.querySelectorAll('.userBlock');
    const continueButton = document.querySelector('.continue-button');
    let selectedProfile = null;

    /* ---------- Profile selection handling ---------- */
    profileOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove 'selected' class and hide check icons from all options
            profileOptions.forEach(opt => {
                opt.classList.remove('selected');
                const checkIcon = opt.querySelector('.check-icon');
                if (checkIcon) {
                    checkIcon.classList.add('hidden');
                }
            });

            // Add 'selected' class and show check icon on clicked option
            option.classList.add('selected');
            const selectedCheckIcon = option.querySelector('.check-icon');
            if (selectedCheckIcon) {
                selectedCheckIcon.classList.remove('hidden'); // Show the check mark (V)
            }

            selectedProfile = option.dataset.profile;
            console.log('Selected profile:', selectedProfile);
            localStorage.setItem('selectedUserType', selectedProfile); /* ---------- Persist selected profile ---------- */
        });
    });

    /* ---------- Continue button click handling ---------- */
    if (continueButton) {
        continueButton.addEventListener('click', () => {
            if (selectedProfile) {
                window.location.href = '/html/loginPage.html';
            } else {
                alert('אנא בחר פרופיל כדי להמשיך.');
            }
        });
    }
});
