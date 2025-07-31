document.addEventListener('DOMContentLoaded', async () => {
    // --- הגדרת אלמנטי HTML ---
    const backButton = document.getElementById('backButton');
    const reportForm = document.querySelector('.report-form');
    const API_BASE_URL = 'https://webfinalproject-server.onrender.com';

    // אלמנטים של סוג תקלה
    const faultTypeSelect = document.querySelector('[data-select-id="fault-type"]');
    const faultTypeOptionsContainer = faultTypeSelect ? faultTypeSelect.querySelector('.options') : null;
    const faultTypeHiddenInput = document.getElementById('fault-type-hidden');
    const faultDescriptionTextarea = document.getElementById('fault-description');
    const faultTypeSelected = faultTypeSelect ? faultTypeSelect.querySelector('.selected') : null;
    const faultDescriptionOptionalIndicator = document.querySelector('label[for="fault-description"] .optional-indicator');
    const faultDescriptionRequiredIndicator = document.querySelector('label[for="fault-description"] .required-indicator');
    const faultDescriptionValidationIconContainer = document.querySelector('label[for="fault-description"] .validation-icon-container');
    const faultTypeStatusIcon = faultTypeSelect ? faultTypeSelect.closest('.input-container')?.querySelector('.asterisk') : null;
    const faultDescriptionStatusIcon = faultDescriptionTextarea ? faultDescriptionTextarea.closest('.frame-textarea')?.querySelector('.validation-icon') : null;

    // אלמנטים של מיקום (מותאמים ל-custom select)
    const customLocationSelect = document.getElementById('locationSelect'); // זהו ה-div עם data-select-id="location"
    const locationSelectedDiv = customLocationSelect ? customLocationSelect.querySelector('.selected') : null;
    const locationOptionsContainer = customLocationSelect ? customLocationSelect.querySelector('.options') : null;
    const locationHiddenInput = document.getElementById('location-hidden');
    const manualAddressSection = document.getElementById('manualAddressSection');
    const citySelect = document.getElementById('citySelect'); // זה עדיין <select> רגיל
    const streetSelect = document.getElementById('streetSelect'); // זה עדיין <select> רגיל
    const houseNumberInput = document.getElementById('houseNumberInput');

    const locationStatusIcon = customLocationSelect ? customLocationSelect.closest('.input-container')?.querySelector('.asterisk') : null;
    const cityStatusIcon = citySelect ? citySelect.closest('.input-container')?.querySelector('.asterisk') : null;
    const streetStatusIcon = streetSelect ? streetSelect.closest('.input-container')?.querySelector('.asterisk') : null;
    const houseNumberStatusIcon = houseNumberInput ? houseNumberInput.closest('.input-container')?.querySelector('.asterisk') : null;


    // אלמנטים של העלאת מדיה (כעת custom-select)
    const mediaUploadCustomSelect = document.getElementById('mediaUploadSelect'); // ה-div החדש של ה-custom select
    const mediaUploadSelectedDiv = mediaUploadCustomSelect ? mediaUploadCustomSelect.querySelector('.selected') : null;
    const mediaUploadOptionsContainer = mediaUploadCustomSelect ? mediaUploadCustomSelect.querySelector('.options') : null;
    const uploadHiddenInput = document.getElementById('upload-hidden'); // הקלט הנסתר החדש
    
    // קטעי מדיה מפוצלים
    const fileUploadSection = document.getElementById('fileUploadSection'); // הסקשן החדש לקובץ
    const cameraSection = document.getElementById('cameraSection'); // הסקשן החדש למצלמה
    
    const mediaFileInput = document.getElementById('media-file');
    const uploadStatusIcon = mediaUploadCustomSelect ? mediaUploadCustomSelect.closest('.input-container')?.querySelector('.asterisk') : null;
    const mediaFileStatusIcon = mediaFileInput ? mediaFileInput.closest('.input-container')?.querySelector('.asterisk') : null; // אייקון של קלט הקובץ

    // אלמנטים של מצלמה
    const video = document.getElementById('cameraPreview');
    const captureButton = document.getElementById('capture');
    const canvas = document.getElementById('canvas');
    let capturedBlob = null;
    let stream = null;

    // משתנים למיקום וכתובת
    let currentLat = null;
    let currentLon = null;
    let locationString = '';
    let currentCity = '';
    let manualLat = null;
    let manualLon = null;
    let manualFullAddress = '';

    // פרטי משתמש מ-localStorage
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    let currentUsername = 'Anonymous';
    let currentUserId = 'anonymous';

    let citiesData = [];
    let streetsData = [];

    // --- פונקציות עזר ---
    const V_ICON_PATH = '../images/V_icon.svg';
    const ASTERISK_ICON_PATH = '../images/asterisk.svg';

    function updateStatusIcon(inputElement, iconElement) {
        if (!inputElement || !iconElement) return;

        // עבור אלמנטי select רגילים (כמו citySelect, streetSelect)
        if (inputElement.tagName === 'SELECT') {
            if (inputElement.value !== '') {
                iconElement.src = V_ICON_PATH;
            } else {
                iconElement.src = ASTERISK_ICON_PATH;
            }
            return;
        }

        // עבור קלט קובץ
        if (inputElement.type === 'file') {
            if (inputElement.files && inputElement.files.length > 0) {
                iconElement.src = V_ICON_PATH;
            } else {
                iconElement.src = ASTERISK_ICON_PATH;
            }
            return;
        }

        // עבור custom-select div (כמו faultTypeSelect, customLocationSelect, mediaUploadCustomSelect)
        if (inputElement.classList && inputElement.classList.contains('custom-select')) {
            const selected = inputElement.querySelector('.selected');
            if (selected && selected.dataset.value && selected.dataset.value.trim() !== '') {
                iconElement.src = V_ICON_PATH;
            } else {
                iconElement.src = ASTERISK_ICON_PATH;
            }
            return;
        }

        // עבור קלט רגיל (כמו houseNumberInput) או textarea (faultDescriptionTextarea)
        if (inputElement.value && inputElement.value.trim() !== '') {
            iconElement.src = V_ICON_PATH;
        } else {
            iconElement.src = ASTERISK_ICON_PATH;
        }
    }

    // --- פונקציות טעינת נתונים ---
    async function loadCities() {
        console.log("loadCities: --- מתחיל טעינת ערים ---");
        try {
            const res = await fetch(`${API_BASE_URL}/api/cities`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();

            // CitySelect הוא select רגיל, לכן הלוגיקה נשארת זהה
            if (!citySelect) {
                console.warn("loadCities: לא נמצא אלמנט עם id citySelect");
                return;
            }

            citySelect.innerHTML = "";
            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = "בחר עיר";
            citySelect.appendChild(defaultOption);

            data.forEach(city => {
                const option = document.createElement("option");
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });

            if (window.$ && $(citySelect).select2) {
                $(citySelect).select2({
                    placeholder: "בחר עיר",
                    dir: "rtl"
                });
            }

            console.log("loadCities: הושלם בהצלחה");
        } catch (err) {
            console.error("loadCities: שגיאה בשליפת ערים:", err);
        }
    }

    async function loadStreetsForCity(cityName) {
        console.log(`loadStreetsForCity: --- מתחיל טעינת רחובות עבור עיר: '${cityName}' ---`);

        // streetSelect הוא select רגיל, לכן הלוגיקה נשארת זהה
        if (!streetSelect) {
            console.warn("loadStreetsForCity: Street select element not found.");
            return;
        }

        streetsData = [];

        if ($(streetSelect).hasClass("select2-hidden-accessible")) {
            $(streetSelect).select2('destroy');
        }

        streetSelect.innerHTML = "";
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "בחר רחוב";
        streetSelect.appendChild(defaultOption);

        if (!cityName) {
            console.log("אין עיר נבחרת, הפונקציה תצא.");
            updateStatusIcon(streetSelect, streetStatusIcon);
            $(streetSelect).select2({
                placeholder: "בחר רחוב",
                dir: "rtl",
                width: "100%"
            });
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/streets?city=${encodeURIComponent(cityName)}`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const data = await res.json();
            streetsData = [...new Set(data)];

            streetsData.forEach(street => {
                const name = typeof street === 'string' ? street : street.name;
                const option = document.createElement("option");
                option.value = name;
                option.textContent = name;
                streetSelect.appendChild(option);
            });

            $(streetSelect).select2({
                placeholder: "בחר רחוב",
                dir: "rtl",
                width: "100%"
            });
            updateStatusIcon(streetSelect, streetStatusIcon);

        } catch (err) {
            console.error("שגיאה בטעינת רחובות:", err);
            streetSelect.innerHTML = '<option value="">שגיאה בטעינת רחובות</option>';
            updateStatusIcon(streetSelect, streetStatusIcon);
        } finally {
            console.log("loadStreetsForCity: --- הסתיים ---");
        }
    }

  async function loadFaultTypes() {
    console.log('[INFO] טוען סוגי תקלות מהשרת...');
    if (!faultTypeOptionsContainer || !faultTypeSelected || !faultTypeHiddenInput || !faultTypeSelect) {
        console.warn('loadFaultTypes: אלמנטים נדרשים לסוג תקלה לא נמצאו. דילוג על הטעינה.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/fault-types`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch fault types');
        }

        const faultTypes = await response.json();
        console.log('[DEBUG] סוגי תקלות התקבלו:', faultTypes);

        // נקה אפשרויות קודמות
        faultTypeOptionsContainer.innerHTML = '';

        // יצירת אפשרויות ה-li
        faultTypes.forEach(type => {
            const option = document.createElement('li');
            option.textContent = type.label;
            option.dataset.value = type.value;
            option.setAttribute('role', 'option');

            // *** הוספת ה-Event Listener המתוקן לכל אפשרות ***
            option.addEventListener('click', (e) => {
                // מונע מהלחיצה להתפשט לאלמנטים עליונים ולגרום לסגירה כפולה
                e.stopPropagation();

                // עדכן את הטקסט והערך של האלמנט הנבחר
                faultTypeSelected.textContent = type.label;
                faultTypeSelected.dataset.value = type.value;
                faultTypeHiddenInput.value = type.value; // עדכן את הקלט הנסתר לטופס

                // סגור את ה-custom select
                faultTypeSelect.setAttribute('aria-expanded', 'false');
                faultTypeSelect.classList.remove('open');

                // הסר מחלקת 'selected' מכל האפשרויות והוסף לאפשרות שנלחצה
                faultTypeOptionsContainer.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
                option.classList.add('selected');

                // עדכן דרישות תיאור וסטטוס אייקונים
                updateFaultDescriptionRequirement();
                updateStatusIcon(faultTypeSelect, faultTypeStatusIcon);
            });

            faultTypeOptionsContainer.appendChild(option);
        });

        // הגדר ערך התחלתי אם עדיין לא הוגדר (לדוגמה, מטופס שנשמר קודם)
        if (faultTypes.length > 0 && !faultTypeSelected.dataset.value) {
            // אין לבחור באופן אוטומטי. "בחר תקלה" צריך להיות ברירת מחדל.
            // נשאיר את זה ריק ונשלוט ב-placeholder בלבד.
            faultTypeSelected.textContent = "בחר תקלה";
            faultTypeSelected.dataset.value = "";
            faultTypeHiddenInput.value = "";
        }

    } catch (error) {
        console.error('שגיאה בטעינת סוגי התקלות:', error);
        alert('שגיאה בטעינת סוגי התקלות. אנא רענן את הדף או נסה שוב מאוחר יותר.');
    }
}
    async function loadLocationModes() {
        console.log('[INFO] טוען מצבי מיקום מהשרת...');
        if (!customLocationSelect || !locationSelectedDiv || !locationOptionsContainer || !locationHiddenInput) {
            console.warn('loadLocationModes: אלמנטים נדרשים ל-custom select של מיקום לא נמצאו. דילוג על הטעינה.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/location-modes`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch location modes');
            }
            const locationModes = await response.json();
            console.log('[DEBUG] מצבי מיקום התקבלו:', locationModes);

            // נקה אפשרויות קודמות
            locationOptionsContainer.innerHTML = '';

            // הוסף רק את האפשרויות מהשרת. "בחר מיקום" יהיה placeholder בלבד.
            locationModes.forEach(mode => {
                const optionItem = document.createElement('li');
                optionItem.className = 'option';
                optionItem.setAttribute('role', 'option');
                optionItem.setAttribute('tabindex', '0');
                optionItem.textContent = mode.label;
                optionItem.dataset.value = mode.value;
                locationOptionsContainer.appendChild(optionItem);

                optionItem.addEventListener('click', () => {
                    locationSelectedDiv.textContent = mode.label;
                    locationSelectedDiv.dataset.value = mode.value;
                    locationHiddenInput.value = mode.value;
                    customLocationSelect.setAttribute('aria-expanded', 'false');
                    customLocationSelect.classList.remove('open'); // סגור את ה-custom select

                    // הסר מחלקת 'selected' מכל האפשרויות והוסף לאפשרות שנלחצה
                    locationOptionsContainer.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
                    optionItem.classList.add('selected');

                    handleLocationSelection(); // קרא ל-handler כדי לעדכן את ה-UI על בסיס הבחירה
                    updateStatusIcon(customLocationSelect, locationStatusIcon);
                });
            });

            // הגדר את "בחר מיקום" כברירת המחדל הנבחרת בתיבה הראשית בלבד
            locationSelectedDiv.textContent = "בחר מיקום";
            locationSelectedDiv.dataset.value = ""; // ודא ש-data-value ריק
            locationHiddenInput.value = "";
            // אין צורך לסמן כ-selected אף אופציה פנימית, כי "בחר מיקום" אינו אופציה פנימית

            // קרא ל-handleLocationSelection פעם אחת כדי לוודא שקטע הכתובת הידנית מוסתר
            // אם "בחר מיקום" נבחר, מבלי להפעיל getCurrentLocation()
            handleLocationSelection();

            updateStatusIcon(customLocationSelect, locationStatusIcon);
            console.log('[INFO] מצבי מיקום נטענו בהצלחה.');
        } catch (error) {
            console.error('שגיאה בטעינת מיקומים:', error);
            alert('שגיאה בטעינת מיקומים. אנא רענן את הדף או נסה שוב מאוחר יותר.');
        }
    }

    // --- לוגיקה עבור Custom Select של העלאת מדיה ---
    async function loadMediaOptions() {
        console.log('[INFO] טוען אפשרויות מדיה מהשרת...');
        if (!mediaUploadCustomSelect || !mediaUploadSelectedDiv || !mediaUploadOptionsContainer || !uploadHiddenInput) {
            console.warn('loadMediaOptions: אלמנטים נדרשים ל-custom select של העלאת מדיה לא נמצאו. דילוג על הטעינה.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/media-options`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch media options');
            }
            const mediaOptions = await response.json();
            console.log('[DEBUG] אפשרויות מדיה התקבלו:', mediaOptions);

            // נקה אפשרויות קודמות
            mediaUploadOptionsContainer.innerHTML = '';

            // הוסף רק את האפשרויות מהשרת. "בחר אפשרות" יהיה placeholder בלבד.
            mediaOptions.forEach(opt => {
                const optionItem = document.createElement('li');
                optionItem.className = 'option';
                optionItem.setAttribute('role', 'option');
                optionItem.setAttribute('tabindex', '0');
                optionItem.textContent = opt.label;
                optionItem.dataset.value = opt.value;
                mediaUploadOptionsContainer.appendChild(optionItem);

                optionItem.addEventListener('click', () => {
                    mediaUploadSelectedDiv.textContent = opt.label;
                    mediaUploadSelectedDiv.dataset.value = opt.value;
                    uploadHiddenInput.value = opt.value; // עדכן את הקלט הנסתר
                    mediaUploadCustomSelect.setAttribute('aria-expanded', 'false');
                    mediaUploadCustomSelect.classList.remove('open'); // סגור את ה-custom select

                    // הסר מחלקת 'selected' מכל האפשרויות והוסף לאפשרות שנלחצה
                    mediaUploadOptionsContainer.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
                    optionItem.classList.add('selected');

                    updateMediaUploadVisibility(); // קרא ל-handler כדי לעדכן את ה-UI
                    updateStatusIcon(mediaUploadCustomSelect, uploadStatusIcon);
                });
            });

            // הגדר את "בחר אפשרות" כברירת המחדל הנבחרת בתיבה הראשית בלבד
            mediaUploadSelectedDiv.textContent = "בחר אפשרות";
            mediaUploadSelectedDiv.dataset.value = ""; // ודא ש-data-value ריק
            uploadHiddenInput.value = "";
            // אין צורך לסמן כ-selected אף אופציה פנימית

            // קרא ל-updateMediaUploadVisibility פעם אחת כדי לוודא שקטעי המדיה מוסתרים
            // כשה-placeholder נבחר
            updateMediaUploadVisibility();

            updateStatusIcon(mediaUploadCustomSelect, uploadStatusIcon);
            console.log('[INFO] אפשרויות מדיה נטענו בהצלחה.');
        } catch (error) {
            console.error('שגיאה בטעינת אפשרויות מדיה:', error);
            alert('שגיאה בטעינת אפשרויות מדיה. אנא רענן את הדף או נסה שוב מאוחר יותר.');
        }
    }


    // --- פונקציות עדכון UI/לוגיקה ---
    function updateFaultDescriptionRequirement() {
        // וודא ש-faultTypeSelected אינו null לפני גישה ל-dataset שלו
        const selectedFaultType = faultTypeSelected ? faultTypeSelected.dataset.value : '';

        if (selectedFaultType === 'אחר') {
            if (faultDescriptionTextarea) faultDescriptionTextarea.setAttribute('required', 'true');
            if (faultDescriptionOptionalIndicator) faultDescriptionOptionalIndicator.style.display = 'none';
            if (faultDescriptionRequiredIndicator) faultDescriptionRequiredIndicator.style.display = 'inline';
            if (faultDescriptionValidationIconContainer) faultDescriptionValidationIconContainer.style.display = 'inline-block';
        } else {
            if (faultDescriptionTextarea) faultDescriptionTextarea.removeAttribute('required');
            if (faultDescriptionOptionalIndicator) faultDescriptionOptionalIndicator.style.display = 'inline';
            if (faultDescriptionRequiredIndicator) faultDescriptionRequiredIndicator.style.display = 'none';
            if (faultDescriptionValidationIconContainer) faultDescriptionValidationIconContainer.style.display = 'none';
            if (faultDescriptionTextarea) faultDescriptionTextarea.value = '';
        }
        updateStatusIcon(faultTypeSelect, faultTypeStatusIcon);
        updateStatusIcon(faultDescriptionTextarea, faultDescriptionStatusIcon);
    }

    function handleLocationSelection() {
        // קבל את הערך הנבחר מתוך ה-div.selected של ה-custom select
        const selectedLocationType = locationSelectedDiv ? locationSelectedDiv.dataset.value : '';
        console.log(`handleLocationSelection: סוג מיקום נבחר: ${selectedLocationType}`);

        // וודא שאלמנטים קיימים לפני ניסיון שינוי שלהם
        if (!manualAddressSection || !citySelect || !streetSelect || !houseNumberInput) {
            console.warn('handleLocationSelection: חסרים אלמנטים של קטע כתובת. דילוג על עדכוני UI.');
            return;
        }

        if (selectedLocationType === 'loc2') { // הזנת כתובת ידנית
            manualAddressSection.style.display = 'block';
            citySelect.setAttribute('required', 'true');
            streetSelect.setAttribute('required', 'true');
            houseNumberInput.removeAttribute('required'); // מספר בית הוא אופציונלי עבור הזנה ידנית

            loadStreetsForCity(citySelect.value.trim()); // טען רחובות על בסיס בחירת העיר הנוכחית
            updateStatusIcon(citySelect, cityStatusIcon);
            updateStatusIcon(streetSelect, streetStatusIcon);

            // טפל באייקון מספר הבית על בסיס סטטוס ה-required הנוכחי שלו (שלרוב אינו נדרש עבור ידני)
            if (houseNumberInput.hasAttribute('required') && houseNumberStatusIcon) {
                updateStatusIcon(houseNumberInput, houseNumberStatusIcon);
            } else if (houseNumberStatusIcon) {
                houseNumberStatusIcon.src = ASTERISK_ICON_PATH; // אם לא נדרש, הצג כוכבית
            }

            currentLat = null;
            currentLon = null;
            locationString = '';
            currentCity = '';
        } else if (selectedLocationType === 'loc1') { // זיהוי מיקום אוטומטי
            manualAddressSection.style.display = 'none';
            citySelect.removeAttribute('required');
            citySelect.value = '';
            streetSelect.removeAttribute('required');
            streetSelect.value = '';
            houseNumberInput.removeAttribute('required');
            houseNumberInput.value = '';
            streetsData = []; // נקה רחובות נטענים

            // איפוס אייקוני סטטוס לשדות ידניים
            if (cityStatusIcon) cityStatusIcon.src = ASTERISK_ICON_PATH;
            if (streetStatusIcon) streetStatusIcon.src = ASTERISK_ICON_PATH;
            if (houseNumberStatusIcon) houseNumberStatusIcon.src = ASTERISK_ICON_PATH;

            getCurrentLocation(); // נסה לקבל את המיקום הנוכחי
        } else { // ברירת מחדל / אין בחירה (כאשר selectedLocationType === "")
            manualAddressSection.style.display = 'none';
            citySelect.removeAttribute('required');
            citySelect.value = '';
            streetSelect.removeAttribute('required');
            streetSelect.value = '';
            houseNumberInput.removeAttribute('required');
            houseNumberInput.value = '';
            streetsData = []; // נקה רחובות נטענים

            // איפוס אייקוני סטטוס לשדות ידניים
            if (cityStatusIcon) cityStatusIcon.src = ASTERISK_ICON_PATH;
            if (streetStatusIcon) streetStatusIcon.src = ASTERISK_ICON_PATH;
            if (houseNumberStatusIcon) houseNumberStatusIcon.src = ASTERISK_ICON_PATH;

            currentLat = null;
            currentLon = null;
            locationString = '';
            currentCity = '';
        }
        updateStatusIcon(customLocationSelect, locationStatusIcon); // עדכן סטטוס עבור ה-custom select של המיקום
    }

    async function getCurrentLocation() {
        if (!navigator.geolocation) {
            alert("הדפדפן שלך אינו תומך ב-Geolocation. אנא השתמש באפשרות 'הזנת מיקום ידנית'.");
            // אם geolocation לא נתמך, עבור אוטומטית למצב ידני
            if (locationSelectedDiv && locationHiddenInput && customLocationSelect) {
                locationSelectedDiv.textContent = 'הזנה ידנית';
                locationSelectedDiv.dataset.value = 'loc2';
                locationHiddenInput.value = 'loc2';
                handleLocationSelection(); // חשב מחדש את ה-UI על בסיס הבחירה החדשה
            }
            return;
        }
        console.log("getCurrentLocation: מנסה לקבל מיקום נוכחי...");
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                currentLat = position.coords.latitude;
                currentLon = position.coords.longitude;
                console.log(`getCurrentLocation: מיקום נוכחי: קו רוחב ${currentLat}, קו אורך ${currentLon}`);
                try {
                    const response = await fetch(`${API_BASE_URL}/api/geocode?latlng=${currentLat},${currentLon}`);
                    const data = await response.json();
                    console.log("getCurrentLocation: תגובת API לגיאוקודינג:", data);
                    if (data.status === 'OK' && data.results.length > 0) {
                        locationString = data.results[0].formatted_address;
                        const addressComponents = data.results[0].address_components;
                        const cityComponent = addressComponents.find(component =>
                            component.types.includes('locality') || component.types.includes('administrative_area_level_1')
                        );
                        currentCity = cityComponent ? cityComponent.long_name : '';
                        console.log("getCurrentLocation: כתובת מפוענחת:", locationString, "עיר:", currentCity);
                        alert(`המיקום זוהה: ${locationString}`);
                        updateStatusIcon(customLocationSelect, locationStatusIcon); // עדכן אייקון לאחר זיהוי מוצלח
                    } else {
                        locationString = `קו רוחב: ${currentLat}, קו אורך: ${currentLon}`;
                        currentCity = '';
                        alert("המיקום זוהה, אך לא ניתן להמיר לכתובת מלאה.");
                        updateStatusIcon(customLocationSelect, locationStatusIcon);
                    }
                } catch (err) {
                    console.error("getCurrentLocation: שגיאת גיאוקודינג:", err);
                    locationString = `קו רוחב: ${currentLat}, קו אורך: ${currentLon}`;
                    currentCity = '';
                    alert("המיקום זוהה, אך לא ניתן לקבל כתובת מלאה.");
                    updateStatusIcon(customLocationSelect, locationStatusIcon);
                }
            },
            (error) => {
                console.error("getCurrentLocation: שגיאה בקבלת מיקום נוכחי:", error);
                let errorMessage = "אירעה שגיאה בעת זיהוי המיקום.";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "המשתמש סירב לבקשת Geolocation. אנא אפשר גישה למיקום בהגדרות הדפדפן.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "פרטי המיקום אינם זמינים.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "הבקשה לקבלת מיקום חרגה מזמן.";
                        break;
                    case error.UNKNOWN_ERROR:
                        errorMessage = "אירעה שגיאה בלתי ידועה בעת זיהוי מיקום.";
                        break;
                }
                alert(errorMessage);
                // עבור למצב ידני אם זיהוי המיקום נכשל
                if (locationSelectedDiv && locationHiddenInput && customLocationSelect) {
                    locationSelectedDiv.textContent = 'הזנה ידנית';
                    locationSelectedDiv.dataset.value = 'loc2';
                    locationHiddenInput.value = 'loc2';
                }
                handleLocationSelection(); // הפעל מחדש עדכון UI
                currentLat = null;
                currentLon = null;
                locationString = '';
                currentCity = '';
                updateStatusIcon(customLocationSelect, locationStatusIcon);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }
    async function geocodeAddress(city, street, houseNumber) {
        const address = `${houseNumber ? houseNumber + ' ' : ''}${street}, ${city}, Israel`;
        console.log(`geocodeAddress: מנסה לפענח כתובת גיאוגרפית: '${address}'`);
        try {
            const response = await fetch(`${API_BASE_URL}/api/geocode?address=${encodeURIComponent(address)}`);
            const data = await response.json();
            console.log("geocodeAddress: תגובת API לגיאוקודינג:", data);
            if (data.status === 'OK' && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                manualLat = location.lat;
                manualLon = location.lng;
                manualFullAddress = data.results[0].formatted_address;
                console.log(`geocodeAddress: פוענח בהצלחה. קו רוחב: ${manualLat}, קו אורך: ${manualLon}, כתובת מלאה: ${manualFullAddress}`);
                return { lat: manualLat, lng: manualLon, fullAddress: manualFullAddress };
            } else {
                manualLat = null;
                manualLon = null;
                manualFullAddress = '';
                console.warn(`geocodeAddress: לא ניתן לפענח כתובת גיאוגרפית: ${address}. סטטוס: ${data.status}`);
                alert(`לא ניתן למצוא קואורדינטות עבור הכתובת שסופקה: ${address}. אנא בדוק את הכתובת.`);
                return null;
            }
        } catch (err) {
            manualLat = null;
            manualLon = null;
            manualFullAddress = '';
            console.error('geocodeAddress: שגיאה במהלך גיאוקודינג:', err);
            alert(`אירעה שגיאה במהלך גיאוקודינג כתובת: ${err.message}`);
            return null;
        }
    }

    function updateMediaUploadVisibility() {
        // קבל את הערך הנבחר מתוך ה-div.selected של ה-custom select של העלאת המדיה
        const selectedUploadOption = mediaUploadSelectedDiv ? mediaUploadSelectedDiv.dataset.value : '';
        console.log('updateMediaUploadVisibility: אפשרות העלאה נבחרה:', selectedUploadOption);

        // הסתר את כל הסקשנים וקבע required/accept כ-false כברירת מחדל
        if (fileUploadSection) fileUploadSection.style.display = 'none';
        if (cameraSection) cameraSection.style.display = 'none';
        
        if (mediaFileInput) {
            mediaFileInput.removeAttribute('required');
            mediaFileInput.removeAttribute('accept');
            mediaFileInput.removeAttribute('capture');
            mediaFileInput.value = ''; // נקה קלט קובץ
            updateStatusIcon(mediaFileInput, mediaFileStatusIcon); // עדכן סטטוס
        }
        
        stopCamera(); // וודא שהמצלמה נעצרת כשמחליפים אפשרויות
        capturedBlob = null; // אפס את הבלוב של התמונה שצולמה
        const existingPreview = document.getElementById('capturedImagePreview');
        if (existingPreview) {
            existingPreview.remove(); // הסר תצוגה מקדימה של תמונה שצולמה
        }

        if (selectedUploadOption === 'option1') { // אפשרות מצלמה
            if (cameraSection) cameraSection.style.display = 'block';
            fileUploadSection.style.display = 'none';
            mediaFileInput.removeAttribute('required');
            video.style.display = 'block';
            captureButton.style.display = 'inline-block';
            startCamera();
            // עבור מצלמה, קובץ המדיה אינו 'נדרש' דרך ה-input type="file"
            // אלא דרך זה ש-capturedBlob יכיל נתונים.
            // לכן אין צורך להגדיר mediaFileInput.setAttribute('required', 'true'); כאן.
        } else if (selectedUploadOption === 'option2') { // אפשרות העלאת קובץ
            if (fileUploadSection) fileUploadSection.style.display = 'block';
            if (mediaFileInput) {
                mediaFileInput.setAttribute('required', 'true');
                mediaFileInput.setAttribute('accept', 'image/*,video/*');
                updateStatusIcon(mediaFileInput, mediaFileStatusIcon); // עדכן אייקון לאחר הגדרת required
            }
        }
        console.log('updateMediaUploadVisibility: שדה קובץ מדיה נדרש:', mediaFileInput?.hasAttribute('required'));
        updateStatusIcon(mediaUploadCustomSelect, uploadStatusIcon); // עדכן אייקון עבור הסלקט הראשי
    }

 async function startCamera() {
        try {
            stopCamera();
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.play();
            console.log("startCamera: Camera started successfully.");
        } catch (err) {
            console.error('startCamera: Error accessing camera:', err);
            alert('Cannot enable camera: ' + err.message + '\nPlease ensure you have a camera connected and allow access to it in your browser settings.');
            uploadSelect.value = '';
            updateMediaUploadVisibility();
        }
    }
    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
                console.log("stopCamera: Camera track stopped.");
            });
            stream = null;
        }
        video.srcObject = null;
        video.pause();
        console.log("stopCamera: Camera stopped.");
    }
    if (captureButton) {
        captureButton.addEventListener('click', () => {
            if (!stream) {
                alert('No active camera stream to capture image.');
                return;
            }
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
                capturedBlob = blob;
                const img = document.createElement('img');
                img.src = URL.createObjectURL(blob);
                img.style.maxWidth = '200px';
                img.style.maxHeight = '200px';
                img.style.marginTop = '10px';
                const existingPreview = document.getElementById('capturedImagePreview');
                if (existingPreview) {
                    existingPreview.src = img.src;
                } else {
                    img.id = 'capturedImagePreview';
                    captureButton.parentNode.insertBefore(img, captureButton.nextSibling);
                }
                stopCamera();
                video.style.display = 'none';
                captureButton.style.display = 'none';
                updateStatusIcon({ type: 'file', files: [capturedBlob] }, mediaFileStatusIcon);
            }, 'image/jpeg');
        });
    }
    // --- אתחולים ו-Event Listeners ---

    // Event listener לכפתור חזור
    if (backButton) {
        backButton.addEventListener('click', (event) => {
            event.preventDefault();
            window.location.href = '/html/homePageCitizen.html';
        });
    }

    // Event listener לכפתור צילום במצלמה
    if (captureButton) {
        captureButton.addEventListener('click', () => {
            if (!stream) {
                alert('אין זרם מצלמה פעיל לצילום תמונה.');
                return;
            }
            if (!canvas || !video) {
                console.error('אלמנט Canvas או video לא נמצא.');
                return;
            }
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
                capturedBlob = blob;
                alert("התמונה צולמה ונשמרה בהצלחה עבור הדיווח.");
                const img = document.createElement('img');
                img.src = URL.createObjectURL(blob);
                img.style.maxWidth = '100px';
                img.style.maxHeight = '100px';
                img.style.marginTop = '10px';
                img.style.display = 'block'; // כדי להבטיח שהתמונה מוצגת בנפרד
                const existingPreview = document.getElementById('capturedImagePreview');
                if (existingPreview) {
                    existingPreview.src = img.src;
                } else {
                    img.id = 'capturedImagePreview';
                    // הוסף את התצוגה המקדימה בתוך cameraSection
                    if (cameraSection) {
                        cameraSection.appendChild(img);
                    }
                }
                stopCamera();
                // אין צורך להסתיר video ו-captureButton כאן כי הם בתוך cameraSection
                // והוא נשאר גלוי במצב 'option1'.
                updateStatusIcon({ type: 'file', files: [capturedBlob] }, mediaFileStatusIcon); // נעדכן את אייקון הקובץ באמצעות בלוב שנוצר
            }, 'image/jpeg');
        });
    }

    // --- Event Listeners עבור Custom Select של סוג תקלה ---
    if (faultTypeSelect) {
        faultTypeSelect.addEventListener('click', (e) => {
            e.stopPropagation(); // מנע מסגירה מיידית בלחיצת מסמך
            faultTypeSelect.classList.toggle('open');
            faultTypeSelect.setAttribute('aria-expanded', String(faultTypeSelect.classList.contains('open')));
        });
        // הערה: ה-listener ללחיצה על אלמנט 'li' בודד מוגדר בתוך loadFaultTypes
        updateFaultDescriptionRequirement(); // קריאה ראשונית להגדרת סטטוס נדרש ואייקון
        updateStatusIcon(faultTypeSelect, faultTypeStatusIcon);
    }

    if (faultDescriptionTextarea) {
        faultDescriptionTextarea.addEventListener('input', () => {
            updateStatusIcon(faultDescriptionTextarea, faultDescriptionStatusIcon);
        });
        updateStatusIcon(faultDescriptionTextarea, faultDescriptionStatusIcon); // קריאה ראשונית
    }

    // --- Event Listeners עבור Custom Select של מיקום ---
    if (customLocationSelect) {
        locationSelectedDiv.addEventListener('click', (e) => {
            e.stopPropagation(); // מנע מסגירה מיידית בלחיצת מסמך
            customLocationSelect.classList.toggle('open');
            customLocationSelect.setAttribute('aria-expanded', String(customLocationSelect.classList.contains('open')));
        });
        // הערה: ה-listener ללחיצה על אלמנט 'li' בודד מוגדר בתוך loadLocationModes
        // אין צורך ב-listener ישיר ל-'change' על customLocationSelect עצמו, מכיוון ש-'handleLocationSelection'
        // נקראת מתוך ה-listener ללחיצה על אפשרות בודדת.
        updateStatusIcon(customLocationSelect, locationStatusIcon); // קריאה ראשונית
    }

    if (citySelect) {
        // שימוש ב-.on של jQuery עבור אירועי Select2
        $(citySelect).on('select2:select', (e) => {
            const selectedCity = e.params.data.text.trim();
            console.log(`select2: עיר נבחרה: '${selectedCity}'`);
            loadStreetsForCity(selectedCity);
            updateStatusIcon(citySelect, cityStatusIcon);
        });
        citySelect.addEventListener('blur', () => {
            // נסה לפענח כתובת גיאוגרפית רק אם גם עיר וגם רחוב נבחרו
            if (citySelect.value.trim() && streetSelect && streetSelect.value.trim()) {
                geocodeAddress(citySelect.value.trim(), streetSelect.value.trim(), houseNumberInput ? houseNumberInput.value.trim() : '');
            }
            updateStatusIcon(citySelect, cityStatusIcon); // עדכן אייקון ב-blur
        });
    }

    if (streetSelect) {
        $(streetSelect).on('select2:select', () => {
            updateStatusIcon(streetSelect, streetStatusIcon);
            // הפעל גיאוקודינג לאחר בחירת רחוב אם גם עיר נבחרה
            if (citySelect && citySelect.value.trim() && streetSelect.value.trim()) {
                geocodeAddress(citySelect.value.trim(), streetSelect.value.trim(), houseNumberInput ? houseNumberInput.value.trim() : '');
            }
        });
        streetSelect.addEventListener('blur', () => {
            if (citySelect && citySelect.value.trim() && streetSelect.value.trim()) {
                geocodeAddress(citySelect.value.trim(), streetSelect.value.trim(), houseNumberInput ? houseNumberInput.value.trim() : '');
            }
            updateStatusIcon(streetSelect, streetStatusIcon); // עדכן אייקון ב-blur
        });
    }

    if (houseNumberInput) {
        houseNumberInput.addEventListener('input', () => {
            if (houseNumberStatusIcon) {
                updateStatusIcon(houseNumberInput, houseNumberStatusIcon);
            }
        });
        houseNumberInput.addEventListener('blur', () => {
            if (citySelect && citySelect.value.trim() && streetSelect && streetSelect.value.trim()) {
                geocodeAddress(citySelect.value.trim(), streetSelect.value.trim(), houseNumberInput.value.trim());
            }
            if (houseNumberStatusIcon) {
                updateStatusIcon(houseNumberInput, houseNumberStatusIcon);
            }
        });
    }

    // --- Event Listeners עבור Custom Select של העלאת מדיה ---
    if (mediaUploadCustomSelect) {
        mediaUploadSelectedDiv.addEventListener('click', (e) => {
            e.stopPropagation(); // מנע מסגירה מיידית בלחיצת מסמך
            mediaUploadCustomSelect.classList.toggle('open');
            mediaUploadCustomSelect.setAttribute('aria-expanded', String(mediaUploadCustomSelect.classList.contains('open')));
        });
        // הערה: ה-listener ללחיצה על אלמנט 'li' בודד מוגדר בתוך loadMediaOptions
        updateMediaUploadVisibility(); // קריאה ראשונית
        updateStatusIcon(mediaUploadCustomSelect, uploadStatusIcon);
    }

    if (mediaFileInput) {
        mediaFileInput.addEventListener('change', () => {
            updateStatusIcon(mediaFileInput, mediaFileStatusIcon);
        });
        updateStatusIcon(mediaFileInput, mediaFileStatusIcon); // קריאה ראשונית
    }

    // --- שליחת טופס דיווח ---
    if (reportForm) {
        reportForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // בצע אימות טופס (האימות המובנה של הדפדפן עשוי לא לתפוס הכל עם custom selects)
            // מומלץ לבצע אימות מותאם אישית עבור שדות custom select נדרשים.
            // לדוגמה, לבדוק אם faultTypeSelected.dataset.value ריק.
            if (!reportForm.checkValidity() || !faultTypeSelected?.dataset.value || !locationSelectedDiv?.dataset.value || !mediaUploadSelectedDiv?.dataset.value) {
                 alert('אנא מלא את כל השדות הנדרשים.');
                 return;
            }

            const faultType = faultTypeSelected.textContent.trim(); // קבל מהטקסט הנבחר של ה-custom select
            const faultDescription = faultDescriptionTextarea.value.trim();
            const locationType = locationSelectedDiv.dataset.value; // קבל מה-data-value הנבחר של ה-custom select
            let locationData = {};

            if (locationType === 'loc2') { // כתובת ידנית
                // בצע גיאוקודינג מחדש אם קווי רוחב/אורך הם null (לדוגמה, אם המשתמש הזין כתובת אך לא עשה blur/הפעיל גיאוקודינג)
                if (manualLat === null || manualLon === null) {
                    const geocoded = await geocodeAddress(citySelect.value.trim(), streetSelect.value.trim(), houseNumberInput.value.trim());
                    if (!geocoded) {
                        alert('לא ניתן לשלוח דיווח. לא ניתן לקבוע קואורדינטות עבור הכתובת הידנית. אנא בדוק את הכתובת ונסה שוב.');
                        return;
                    }
                }
                locationData = {
                    type: 'manual',
                    city: citySelect.value.trim(),
                    street: streetSelect.value.trim(),
                    houseNumber: houseNumberInput.value.trim(),
                    latitude: manualLat,
                    longitude: manualLon,
                    address: manualFullAddress || `${houseNumberInput.value.trim()} ${streetSelect.value.trim()}, ${citySelect.value.trim()}` // חלופי לכתובת מלאה
                };
            } else if (locationType === 'loc1') { // מיקום נוכחי
                if (currentLat === null || currentLon === null) {
                    alert('לא ניתן לשלוח דיווח. המיקום הנוכחי לא זוהה. אנא נסה שוב או בחר במיקום ידני.');
                    return;
                }
                locationData = {
                    type: 'current',
                    city: currentCity || '',
                    latitude: currentLat,
                    longitude: currentLon,
                    address: locationString || ''
                };
            } else { // אם לא נבחר סוג מיקום (placeholder)
                alert('אנא בחר סוג מיקום.');
                return;
            }

            const uploadOption = mediaUploadSelectedDiv.dataset.value; // קבל מה-data-value של ה-custom select
            let mediaToUpload = null;

            if (uploadOption === 'option1') { // צילום במצלמה
                if (capturedBlob) {
                    mediaToUpload = new File([capturedBlob], 'captured_image.jpeg', { type: 'image/jpeg' });
                } else {
                    alert('לא צולמה תמונה. אנא צלם תמונה או בחר באפשרות אחרת.');
                    return;
                }
            } else if (uploadOption === 'option2') { // העלאת קובץ
                if (mediaFileInput.files.length > 0) {
                    mediaToUpload = mediaFileInput.files[0];
                } else {
                    alert('אנא בחר קובץ תמונה/וידאו מספריית המדיה שלך.');
                    return;
                }
            } else { // אם לא נבחרה אפשרות העלאה (placeholder)
                alert('אנא בחר אפשרות להעלאת מדיה (מצלמה או ספריית תמונות).');
                return;
            }

            const formData = new FormData();
            formData.append('faultType', faultType);
            formData.append('faultDescription', faultDescription);
            formData.append('locationType', locationType);
            formData.append('locationDetails', JSON.stringify(locationData));
            formData.append('uploadOption', uploadOption);

            if (mediaToUpload) {
                formData.append('mediaFile', mediaToUpload);
            }

            formData.append('createdBy', currentUsername);
            formData.append('creatorId', currentUserId);

            console.log('נתוני דיווח מוכנים לשליחת לקוח:', {
                faultType,
                faultDescription,
                locationType,
                locationDetails: locationData,
                uploadOption,
                mediaFile: mediaToUpload ? mediaToUpload.name : 'No file',
                createdBy: currentUsername,
                creatorId: currentUserId
            });

            try {
                console.log('[Client] mediaToUpload:', mediaToUpload);
                console.log('[Client] mediaToUpload name:', mediaToUpload?.name);
                console.log('[Client] mediaToUpload size:', mediaToUpload?.size);
                console.log('[Client] mediaToUpload type:', mediaToUpload?.type);

                for (const pair of formData.entries()) {
                    console.log(pair[0] + ': ' + pair[1]);
                }

                const res = await fetch(`${API_BASE_URL}/api/reports`, {
                    method: 'POST',
                    body: formData
                });

                const data = await res.json();

                if (res.ok) {
                    console.log('הדיווח נשלח בהצלחה:', data.message);
                    let displayLocation = '';
                    if (locationType === 'loc1') {
                        displayLocation = locationString || `המיקום הנוכחי שלך (קו רוחב: ${currentLat}, קו אורך: ${currentLon})`;
                    } else if (locationType === 'loc2') {
                        displayLocation = `עיר: ${citySelect.value} , רחוב: ${streetSelect.value} ,`;
                        if (houseNumberInput.value) {
                            displayLocation += ` מספר בית: ${houseNumberInput.value}`;
                        }
                    }

                    // שמור פרטים ב-localStorage עבור העמוד הבא
                    localStorage.setItem('lastReportDetails', JSON.stringify({
                        faultTypeLabel: faultTypeSelected ? faultTypeSelected.textContent.trim() : '',
                        faultDescription: faultDescription,
                        location: displayLocation,
                        timestamp: new Date().toISOString(),
                        mediaId: data.mediaGridFSId || 'no media',
                        mediaMimeType: data.mediaMimeType || null
                    }));
                    localStorage.setItem('lastReportId', data.reportId || data._id);

                    alert('הדיווח נשלח בהצלחה!');
                    window.location.href = '/html/reportReceivedPage.html';
                } else {
                    alert('שגיאה בשליחת דיווח: ' + data.message);
                }
            } catch (error) {
                console.error('שגיאה בשליחת דיווח:', error);
                alert('אירעה שגיאה בעת שליחת הדיווח. אנא נסה שוב מאוחר יותר.');
            }
        });
    }

    // --- טעינות נתונים ראשוניות ---
    // וודא שהמשתמש מחובר לפני שממשיכים בטעינות אסינכרוניות
    if (loggedInUser) {
        currentUsername = loggedInUser.username;
        currentUserId = loggedInUser.userId;
        console.log('משתמש מחובר:', currentUsername, 'ID:', currentUserId);
    } else {
        console.warn('אין משתמש מחובר ל-localStorage. מפנה מחדש...');
        alert('שגיאה: משתמש לא מחובר. אנא התחבר שוב.');
        window.location.href = '../index.html';
        return; // עצור ביצוע אם אין משתמש מחובר
    }

    // טען נתונים עבור כל אלמנטי custom/select
    await loadCities();
    await loadFaultTypes();
    await loadLocationModes();
    await loadMediaOptions(); // טוען את האפשרויות ל-Custom Select החדש של המדיה

    // עדכוני אייקונים ראשוניים עבור כל האלמנטים לאחר הטעינה
    updateStatusIcon(faultTypeSelect, faultTypeStatusIcon);
    updateStatusIcon(faultDescriptionTextarea, faultDescriptionStatusIcon);
    updateStatusIcon(customLocationSelect, locationStatusIcon);
    updateStatusIcon(citySelect, cityStatusIcon);
    updateStatusIcon(streetSelect, streetStatusIcon);
    updateStatusIcon(houseNumberInput, houseNumberStatusIcon);
    updateStatusIcon(mediaUploadCustomSelect, uploadStatusIcon); // עדכון אייקון עבור ה-Custom Select החדש
    updateStatusIcon(mediaFileInput, mediaFileStatusIcon);

    // הוסף listener כללי למסמך לסגירת custom selects בלחיצה בחוץ
    document.addEventListener('click', (e) => {
        if (faultTypeSelect && !faultTypeSelect.contains(e.target)) {
            faultTypeSelect.classList.remove('open');
            faultTypeSelect.setAttribute('aria-expanded', 'false');
        }
        if (customLocationSelect && !customLocationSelect.contains(e.target)) {
            customLocationSelect.classList.remove('open');
            customLocationSelect.setAttribute('aria-expanded', 'false');
        }
        if (mediaUploadCustomSelect && !mediaUploadCustomSelect.contains(e.target)) {
            mediaUploadCustomSelect.classList.remove('open');
            mediaUploadCustomSelect.setAttribute('aria-expanded', 'false');
        }
    });

}); // סוף DOMContentLoaded