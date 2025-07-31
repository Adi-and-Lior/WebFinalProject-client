document.addEventListener('DOMContentLoaded', () => {

  /* ---------- DOM Elements ---------- */
  const registrationForm         = document.querySelector('.first-login-form');
  const newUsernameInput         = document.getElementById('newUsername');
  const newPasswordInput         = document.getElementById('newPassword');
  const confirmPasswordInput     = document.getElementById('confirmPassword');
  const employeeCodeSection      = document.querySelector('.employee-code-section');
  const employeeAuthCodeInput    = document.getElementById('employeeAuthCode');
  const backButton               = document.getElementById('backButton');
  const selectedUserType         = localStorage.getItem('selectedUserType');
  const BASE_URL                 = 'https://webfinalproject-server.onrender.com';

  /* ---------- Setup toggle visibility for password fields ---------- */
  function setupPasswordToggle(inputId, toggleId, lockIconId) {
    const input     = document.getElementById(inputId);
    const toggle    = document.getElementById(toggleId);
    const lockIcon  = document.getElementById(lockIconId);
    let visible     = false;

    toggle.addEventListener('click', () => {
      visible = !visible;
      input.type = visible ? 'text' : 'password';
      toggle.src = visible ? '../images/eye_open.png' : '../images/eye_closed.png';
    });

    input.addEventListener('input', () => {
      const hasValue = input.value.trim() !== '';
      lockIcon.style.display = hasValue ? 'none' : 'block';
      toggle.style.display   = hasValue ? 'block' : 'none';
    });

    toggle.style.display = 'none';
  }

  /* ---------- Initialize toggle logic for both password fields ---------- */
  setupPasswordToggle('newPassword', 'toggleNewPassword', 'lockIconNew');
  setupPasswordToggle('confirmPassword', 'toggleConfirmPassword', 'lockIconConfirm');

  /* ---------- Back button navigation ---------- */
  if (backButton) {
    backButton.addEventListener('click', () => window.history.back());
  }

  /* ---------- Show or hide employee code section based on user type ---------- */
  if (selectedUserType?.toLowerCase() === 'employee') {
    employeeCodeSection.classList.remove('hidden');
    employeeAuthCodeInput.setAttribute('required', 'true');
  } else {
    employeeCodeSection.classList.add('hidden');
    employeeAuthCodeInput.removeAttribute('required');
  }

  /* ---------- Handle form submission ---------- */
  registrationForm.addEventListener('submit', async event => {
    event.preventDefault();

    const username         = newUsernameInput.value.trim();
    const password         = newPasswordInput.value.trim();
    const confirmPassword  = confirmPasswordInput.value.trim();
    const employeeAuthCode = employeeAuthCodeInput.value.trim();

    /* ---------- Basic validation ---------- */
    if (!username || !password || !confirmPassword) {
      alert('אנא מלא את כל השדות הנדרשים.');
      return;
    }

    if (password !== confirmPassword) {
      alert('הסיסמאות אינן תואמות.');
      newPasswordInput.value     = '';
      confirmPasswordInput.value = '';
      newPasswordInput.focus();
      return;
    }

    if (!selectedUserType) {
      alert('שגיאה: סוג משתמש לא נבחר.');
      return;
    }

    if (selectedUserType.toLowerCase() === 'employee' && !employeeAuthCode) {
      alert('כעובד, עליך להזין קוד אימות.');
      return;
    }

    /* ---------- Prepare request body ---------- */
    try {
      const bodyData = {
        username,
        password,
        userType: selectedUserType
      };

      if (selectedUserType.toLowerCase() === 'employee') {
        bodyData.city = employeeAuthCode;
      }

      /* ---------- Send registration request ---------- */
      const res = await fetch(`${BASE_URL}/api/register`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(bodyData)
      });

      const data = await res.json();

      /* ---------- Handle server response ---------- */
      if (!res.ok) {
        alert(data.message || 'שגיאת הרשמה.');
        return;
      }

      alert('ההרשמה בוצעה בהצלחה!');
      setTimeout(() => {
        window.location.href = '/html/loginPage.html';
      }, 500);
    } catch (err) {
      alert('שגיאת חיבור לשרת.');
      console.error('Fetch error:', err);
    }
  });
});
