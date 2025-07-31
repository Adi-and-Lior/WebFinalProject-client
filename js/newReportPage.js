document.addEventListener('DOMContentLoaded', async () => {
    /* ---------- Define key DOM elements for form interaction ---------- */
    const backButton = document.getElementById('backButton');
    const reportForm = document.querySelector('.report-form');
    const API_BASE_URL = 'https://webfinalproject-server.onrender.com';

    /* ---------- Fault type custom select elements and related inputs ---------- */
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

    /* ---------- Location custom select and related elements ---------- */
    const customLocationSelect = document.getElementById('locationSelect');
    const locationSelectedDiv = customLocationSelect ? customLocationSelect.querySelector('.selected') : null;
    const locationOptionsContainer = customLocationSelect ? customLocationSelect.querySelector('.options') : null;
    const locationHiddenInput = document.getElementById('location-hidden');
    const manualAddressSection = document.getElementById('manualAddressSection');
    const citySelect = document.getElementById('citySelect');
    const streetSelect = document.getElementById('streetSelect');
    const houseNumberInput = document.getElementById('houseNumberInput');
    const locationStatusIcon = customLocationSelect ? customLocationSelect.closest('.input-container')?.querySelector('.asterisk') : null;
    const cityStatusIcon = citySelect ? citySelect.closest('.input-container')?.querySelector('.asterisk') : null;
    const streetStatusIcon = streetSelect ? streetSelect.closest('.input-container')?.querySelector('.asterisk') : null;
    const houseNumberStatusIcon = houseNumberInput ? houseNumberInput.closest('.input-container')?.querySelector('.asterisk') : null;

    /* ---------- Media upload custom select and inputs ---------- */
    const mediaUploadCustomSelect = document.getElementById('mediaUploadSelect');
    const mediaUploadSelectedDiv = mediaUploadCustomSelect ? mediaUploadCustomSelect.querySelector('.selected') : null;
    const mediaUploadOptionsContainer = mediaUploadCustomSelect ? mediaUploadCustomSelect.querySelector('.options') : null;
    const uploadHiddenInput = document.getElementById('upload-hidden');
    const fileUploadSection = document.getElementById('fileUploadSection');
    const cameraSection = document.getElementById('cameraSection');
    const mediaFileInput = document.getElementById('media-file');
    const uploadStatusIcon = mediaUploadCustomSelect ? mediaUploadCustomSelect.closest('.input-container')?.querySelector('.asterisk') : null;
    const mediaFileStatusIcon = mediaFileInput ? mediaFileInput.closest('.input-container')?.querySelector('.asterisk') : null;

    /* ---------- Camera elements ---------- */
    const video = document.getElementById('cameraPreview');
    const captureButton = document.getElementById('capture');
    const canvas = document.getElementById('canvas');
    let capturedBlob = null;
    let stream = null;

    /* ---------- Variables to store location and address info ---------- */
    let currentLat = null;
    let currentLon = null;
    let locationString = '';
    let currentCity = '';
    let manualLat = null;
    let manualLon = null;
    let manualFullAddress = '';

    /* ---------- User data from localStorage ---------- */
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    let currentUsername = 'Anonymous';
    let currentUserId = 'anonymous';

    let citiesData = [];
    let streetsData = [];

    /* ---------- Constants for icon paths ---------- */
    const V_ICON_PATH = '../images/V_icon.svg';
    const ASTERISK_ICON_PATH = '../images/asterisk.svg';

    /* ---------- Update status icon next to input based on validity or selection ---------- */
    function updateStatusIcon(inputElement, iconElement) {
        if (!inputElement || !iconElement) return;

        if (inputElement.tagName === 'SELECT') {
            /* ---------- Regular select element: show check if value selected ---------- */
            iconElement.src = inputElement.value !== '' ? V_ICON_PATH : ASTERISK_ICON_PATH;
            return;
        }

        if (inputElement.type === 'file') {
            /* ---------- File input: show check if file(s) selected ---------- */
            iconElement.src = (inputElement.files && inputElement.files.length > 0) ? V_ICON_PATH : ASTERISK_ICON_PATH;
            return;
        }

        if (inputElement.classList?.contains('custom-select')) {
            /* ---------- Custom select div: check if .selected has non-empty data-value ---------- */
            const selected = inputElement.querySelector('.selected');
            iconElement.src = (selected?.dataset.value?.trim() !== '') ? V_ICON_PATH : ASTERISK_ICON_PATH;
            return;
        }

        /* ---------- Regular input or textarea: show check if value is non-empty ---------- */
        iconElement.src = (inputElement.value && inputElement.value.trim() !== '') ? V_ICON_PATH : ASTERISK_ICON_PATH;
    }

    /* ---------- Load cities list from API and populate citySelect dropdown ---------- */
    async function loadCities() {
        console.log("loadCities: Starting to fetch cities...");
        try {
            const res = await fetch(`${API_BASE_URL}/api/cities`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();

            if (!citySelect) {
                console.warn("loadCities: citySelect element not found");
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

            console.log("loadCities: Successfully loaded cities");
        } catch (err) {
            console.error("loadCities: Error fetching cities:", err);
        }
    }

    /* ---------- Load streets list for a given city and populate streetSelect dropdown ---------- */
    async function loadStreetsForCity(cityName) {
        console.log(`loadStreetsForCity: Starting to fetch streets for city '${cityName}'`);

        if (!streetSelect) {
            console.warn("loadStreetsForCity: streetSelect element not found");
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
            console.log("No city selected, exiting function");
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
            console.error("loadStreetsForCity: Error loading streets:", err);
            streetSelect.innerHTML = '<option value="">שגיאה בטעינת רחובות</option>';
            updateStatusIcon(streetSelect, streetStatusIcon);
        } finally {
            console.log("loadStreetsForCity: Finished");
        }
    }

    /* ---------- Load fault types from API and build custom select options ---------- */
    async function loadFaultTypes() {
        console.log('[INFO] Loading fault types from server...');
        if (!faultTypeOptionsContainer || !faultTypeSelected || !faultTypeHiddenInput || !faultTypeSelect) {
            console.warn('loadFaultTypes: Required fault type elements missing, skipping load.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/fault-types`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch fault types');
            }

            const faultTypes = await response.json();
            console.log('[DEBUG] Received fault types:', faultTypes);

            faultTypeOptionsContainer.innerHTML = '';

            faultTypes.forEach(type => {
                const option = document.createElement('li');
                option.textContent = type.label;
                option.dataset.value = type.value;
                option.setAttribute('role', 'option');

                option.addEventListener('click', (e) => {
                    e.stopPropagation();

                    faultTypeSelected.textContent = type.label;
                    faultTypeSelected.dataset.value = type.value;
                    faultTypeHiddenInput.value = type.value;

                    faultTypeSelect.setAttribute('aria-expanded', 'false');
                    faultTypeSelect.classList.remove('open');

                    faultTypeOptionsContainer.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
                    option.classList.add('selected');

                    updateFaultDescriptionRequirement();
                    updateStatusIcon(faultTypeSelect, faultTypeStatusIcon);
                });

                faultTypeOptionsContainer.appendChild(option);
            });

            if (faultTypes.length > 0 && !faultTypeSelected.dataset.value) {
                faultTypeSelected.textContent = "בחר תקלה";
                faultTypeSelected.dataset.value = "";
                faultTypeHiddenInput.value = "";
            }

        } catch (error) {
            console.error('loadFaultTypes: Error loading fault types:', error);
            alert('שגיאה בטעינת סוגי התקלות. אנא רענן את הדף או נסה שוב מאוחר יותר.');
        }
    }

    /* ---------- Load location modes from API and build custom select options ---------- */
    async function loadLocationModes() {
        console.log('[INFO] Loading location modes from server...');
        if (!customLocationSelect || !locationSelectedDiv || !locationOptionsContainer || !locationHiddenInput) {
            console.warn('loadLocationModes: Required location custom select elements missing, skipping load.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/location-modes`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch location modes');
            }
            const locationModes = await response.json();
            console.log('[DEBUG] Received location modes:', locationModes);

            locationOptionsContainer.innerHTML = '';

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
                    customLocationSelect.classList.remove('open');

                    locationOptionsContainer.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
                    optionItem.classList.add('selected');

                    handleLocationSelection();
                    updateStatusIcon(customLocationSelect, locationStatusIcon);
                });
            });

            locationSelectedDiv.textContent = "בחר מיקום";
            locationSelectedDiv.dataset.value = "";
            locationHiddenInput.value = "";

            handleLocationSelection();

            updateStatusIcon(customLocationSelect, locationStatusIcon);
            console.log('[INFO] Location modes loaded successfully.');
        } catch (error) {
            console.error('loadLocationModes: Error loading location modes:', error);
            alert('שגיאה בטעינת מיקומים. אנא רענן את הדף או נסה שוב מאוחר יותר.');
        }
    }

    /* ---------- Load media upload options from API and build custom select options ---------- */
    async function loadMediaOptions() {
        console.log('[INFO] Loading media options from server...');
        if (!mediaUploadCustomSelect || !mediaUploadSelectedDiv || !mediaUploadOptionsContainer || !uploadHiddenInput) {
            console.warn('loadMediaOptions: Required media upload custom select elements missing, skipping load.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/media-options`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch media options');
            }
            const mediaOptions = await response.json();
            console.log('[DEBUG] Received media options:', mediaOptions);

            mediaUploadOptionsContainer.innerHTML = '';

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
                    uploadHiddenInput.value = opt.value;
                    mediaUploadCustomSelect.setAttribute('aria-expanded', 'false');
                    mediaUploadCustomSelect.classList.remove('open');

                    mediaUploadOptionsContainer.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
                    optionItem.classList.add('selected');

                    updateMediaUploadVisibility();
                    updateStatusIcon(mediaUploadCustomSelect, uploadStatusIcon);
                });
            });

            mediaUploadSelectedDiv.textContent = "בחר אפשרות";
            mediaUploadSelectedDiv.dataset.value = "";
            uploadHiddenInput.value = "";

            updateMediaUploadVisibility();

            updateStatusIcon(mediaUploadCustomSelect, uploadStatusIcon);
            console.log('[INFO] Media options loaded successfully.');
        } catch (error) {
            console.error('loadMediaOptions: Error loading media options:', error);
            alert('שגיאה בטעינת אפשרויות מדיה. אנא רענן את הדף או נסה שוב מאוחר יותר.');
        }
    }
    function updateFaultDescriptionRequirement() {
    /* ---------- Get selected fault type value safely ---------- */
    const selectedFaultType = faultTypeSelected ? faultTypeSelected.dataset.value : '';

    if (selectedFaultType === 'אחר') {
        /* ---------- For 'Other' fault type: make description required and update UI indicators ---------- */
        if (faultDescriptionTextarea) faultDescriptionTextarea.setAttribute('required', 'true');
        if (faultDescriptionOptionalIndicator) faultDescriptionOptionalIndicator.style.display = 'none';
        if (faultDescriptionRequiredIndicator) faultDescriptionRequiredIndicator.style.display = 'inline';
        if (faultDescriptionValidationIconContainer) faultDescriptionValidationIconContainer.style.display = 'inline-block';
    } else {
        /* ---------- For other fault types: remove required attribute and reset UI indicators ---------- */
        if (faultDescriptionTextarea) faultDescriptionTextarea.removeAttribute('required');
        if (faultDescriptionOptionalIndicator) faultDescriptionOptionalIndicator.style.display = 'inline';
        if (faultDescriptionRequiredIndicator) faultDescriptionRequiredIndicator.style.display = 'none';
        if (faultDescriptionValidationIconContainer) faultDescriptionValidationIconContainer.style.display = 'none';
        if (faultDescriptionTextarea) faultDescriptionTextarea.value = '';
    }
    /* ---------- Update status icons for fault type select and description textarea ---------- */
    updateStatusIcon(faultTypeSelect, faultTypeStatusIcon);
    updateStatusIcon(faultDescriptionTextarea, faultDescriptionStatusIcon);
}   

    function handleLocationSelection() {
        /* ---------- Get selected location type from custom select ---------- */
        const selectedLocationType = locationSelectedDiv ? locationSelectedDiv.dataset.value : '';
        console.log(`handleLocationSelection: Selected location type: ${selectedLocationType}`);

        /* ---------- Check for required address section elements before proceeding ---------- */
        if (!manualAddressSection || !citySelect || !streetSelect || !houseNumberInput) {
            console.warn('handleLocationSelection: Missing address section elements, skipping UI updates.');
            return;
        }

        if (selectedLocationType === 'loc2') { // Manual address input
            /* ---------- Show manual address input fields and set appropriate required attributes ---------- */
            manualAddressSection.style.display = 'block';
            citySelect.setAttribute('required', 'true');
            streetSelect.setAttribute('required', 'true');
            houseNumberInput.removeAttribute('required'); // House number optional in manual input

            /* ---------- Load streets for the currently selected city ---------- */
            loadStreetsForCity(citySelect.value.trim());

            /* ---------- Update status icons for city and street selects ---------- */
            updateStatusIcon(citySelect, cityStatusIcon);
            updateStatusIcon(streetSelect, streetStatusIcon);

            /* ---------- Update house number icon based on required status ---------- */
            if (houseNumberInput.hasAttribute('required') && houseNumberStatusIcon) {
                updateStatusIcon(houseNumberInput, houseNumberStatusIcon);
            } else if (houseNumberStatusIcon) {
                houseNumberStatusIcon.src = ASTERISK_ICON_PATH; // Show asterisk if not required
            }

            /* ---------- Reset geolocation variables for manual input ---------- */
            currentLat = null;
            currentLon = null;
            locationString = '';
            currentCity = '';
        } else if (selectedLocationType === 'loc1') { // Automatic location detection
            /* ---------- Hide manual address section and clear input fields ---------- */
            manualAddressSection.style.display = 'none';
            citySelect.removeAttribute('required');
            citySelect.value = '';
            streetSelect.removeAttribute('required');
            streetSelect.value = '';
            houseNumberInput.removeAttribute('required');
            houseNumberInput.value = '';
            streetsData = []; // Clear loaded streets data

            /* ---------- Reset status icons for manual address fields ---------- */
            if (cityStatusIcon) cityStatusIcon.src = ASTERISK_ICON_PATH;
            if (streetStatusIcon) streetStatusIcon.src = ASTERISK_ICON_PATH;
            if (houseNumberStatusIcon) houseNumberStatusIcon.src = ASTERISK_ICON_PATH;

            /* ---------- Attempt to get current geolocation ---------- */
            getCurrentLocation();
        } else {
            /* ---------- Default case: no selection or empty value, reset form and status ---------- */
            manualAddressSection.style.display = 'none';
            citySelect.removeAttribute('required');
            citySelect.value = '';
            streetSelect.removeAttribute('required');
            streetSelect.value = '';
            houseNumberInput.removeAttribute('required');
            houseNumberInput.value = '';
            streetsData = [];

            if (cityStatusIcon) cityStatusIcon.src = ASTERISK_ICON_PATH;
            if (streetStatusIcon) streetStatusIcon.src = ASTERISK_ICON_PATH;
            if (houseNumberStatusIcon) houseNumberStatusIcon.src = ASTERISK_ICON_PATH;

            currentLat = null;
            currentLon = null;
            locationString = '';
            currentCity = '';
        }
        /* ---------- Update status icon for the custom location select ---------- */
        updateStatusIcon(customLocationSelect, locationStatusIcon);
    }

    async function getCurrentLocation() {
        if (!navigator.geolocation) {
            alert("הדפדפן שלך אינו תומך ב-Geolocation. אנא השתמש באפשרות 'הזנת מיקום ידנית'.");
            /* ---------- Fallback to manual input if geolocation unsupported ---------- */
            if (locationSelectedDiv && locationHiddenInput && customLocationSelect) {
                locationSelectedDiv.textContent = 'הזנה ידנית';
                locationSelectedDiv.dataset.value = 'loc2';
                locationHiddenInput.value = 'loc2';
                handleLocationSelection();
            }
            return;
        }
        console.log("getCurrentLocation: Attempting to get current position...");
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                currentLat = position.coords.latitude;
                currentLon = position.coords.longitude;
                console.log(`getCurrentLocation: Current position: lat ${currentLat}, lon ${currentLon}`);
                try {
                    /* ---------- Reverse geocode coordinates to address ---------- */
                    const response = await fetch(`${API_BASE_URL}/api/geocode?latlng=${currentLat},${currentLon}`);
                    const data = await response.json();
                    console.log("getCurrentLocation: Geocoding API response:", data);
                    if (data.status === 'OK' && data.results.length > 0) {
                        locationString = data.results[0].formatted_address;
                        const addressComponents = data.results[0].address_components;
                        /* ---------- Extract city component from address ---------- */
                        const cityComponent = addressComponents.find(component =>
                            component.types.includes('locality') || component.types.includes('administrative_area_level_1')
                        );
                        currentCity = cityComponent ? cityComponent.long_name : '';
                        console.log("getCurrentLocation: Parsed address:", locationString, "City:", currentCity);
                        alert(`המיקום זוהה: ${locationString}`);
                        updateStatusIcon(customLocationSelect, locationStatusIcon);
                    } else {
                        locationString = `קו רוחב: ${currentLat}, קו אורך: ${currentLon}`;
                        currentCity = '';
                        alert("המיקום זוהה, אך לא ניתן להמיר לכתובת מלאה.");
                        updateStatusIcon(customLocationSelect, locationStatusIcon);
                    }
                } catch (err) {
                    console.error("getCurrentLocation: Geocoding error:", err);
                    locationString = `קו רוחב: ${currentLat}, קו אורך: ${currentLon}`;
                    currentCity = '';
                    alert("המיקום זוהה, אך לא ניתן לקבל כתובת מלאה.");
                    updateStatusIcon(customLocationSelect, locationStatusIcon);
                }
            },
            (error) => {
                console.error("getCurrentLocation: Geolocation error:", error);
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
                /* ---------- Switch to manual location input on failure ---------- */
                if (locationSelectedDiv && locationHiddenInput && customLocationSelect) {
                    locationSelectedDiv.textContent = 'הזנה ידנית';
                    locationSelectedDiv.dataset.value = 'loc2';
                    locationHiddenInput.value = 'loc2';
                }
                handleLocationSelection();
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
        /* ---------- Compose address string for geocoding ---------- */
        const address = `${houseNumber ? houseNumber + ' ' : ''}${street}, ${city}, Israel`;
        console.log(`geocodeAddress: Attempting to geocode address: '${address}'`);
        try {
            /* ---------- Call geocoding API ---------- */
            const response = await fetch(`${API_BASE_URL}/api/geocode?address=${encodeURIComponent(address)}`);
            const data = await response.json();
            console.log("geocodeAddress: API response:", data);
            if (data.status === 'OK' && data.results.length > 0) {
                /* ---------- Extract location coordinates and formatted address ---------- */
                const location = data.results[0].geometry.location;
                manualLat = location.lat;
                manualLon = location.lng;
                manualFullAddress = data.results[0].formatted_address;
                console.log(`geocodeAddress: Successfully geocoded. Lat: ${manualLat}, Lon: ${manualLon}, Address: ${manualFullAddress}`);
                return { lat: manualLat, lng: manualLon, fullAddress: manualFullAddress };
            } else {
                manualLat = null;
                manualLon = null;
                manualFullAddress = '';
                console.warn(`geocodeAddress: Unable to geocode address: ${address}. Status: ${data.status}`);
                alert(`לא ניתן למצוא קואורדינטות עבור הכתובת שסופקה: ${address}. אנא בדוק את הכתובת.`);
                return null;
            }
        } catch (err) {
            manualLat = null;
            manualLon = null;
            manualFullAddress = '';
            console.error('geocodeAddress: Geocoding error:', err);
            alert(`אירעה שגיאה במהלך גיאוקודינג כתובת: ${err.message}`);
            return null;
        }
    }

    function updateMediaUploadVisibility() {
        /* ---------- Get selected media upload option ---------- */
        const selectedUploadOption = mediaUploadSelectedDiv ? mediaUploadSelectedDiv.dataset.value : '';
        console.log('updateMediaUploadVisibility: Selected upload option:', selectedUploadOption);

        /* ---------- Hide all media upload sections and reset attributes ---------- */
        if (fileUploadSection) fileUploadSection.style.display = 'none';
        if (cameraSection) cameraSection.style.display = 'none';

        if (mediaFileInput) {
            mediaFileInput.removeAttribute('required');
            mediaFileInput.removeAttribute('accept');
            mediaFileInput.removeAttribute('capture');
            mediaFileInput.value = ''; // Clear file input
            updateStatusIcon(mediaFileInput, mediaFileStatusIcon);
        }

        /* ---------- Stop camera and clear captured blob & preview ---------- */
        stopCamera();
        capturedBlob = null;
        const existingPreview = document.getElementById('capturedImagePreview');
        if (existingPreview) {
            existingPreview.remove();
        }

        if (selectedUploadOption === 'option1') { // Camera option
            if (cameraSection) cameraSection.style.display = 'block';
            if (fileUploadSection) fileUploadSection.style.display = 'none';
            if (mediaFileInput) {
                mediaFileInput.removeAttribute('required');
            }
            if (video) video.style.display = 'block';
            if (captureButton) captureButton.style.display = 'inline-block';
            startCamera();
            /* ---------- For camera input, file input is not required; blob used instead ---------- */
        } else if (selectedUploadOption === 'option2') { // File upload option
            if (fileUploadSection) fileUploadSection.style.display = 'block';
            if (mediaFileInput) {
                mediaFileInput.setAttribute('required', 'true');
                mediaFileInput.setAttribute('accept', 'image/*,video/*');
                updateStatusIcon(mediaFileInput, mediaFileStatusIcon);
            }
        }
        console.log('updateMediaUploadVisibility: File input required:', mediaFileInput?.hasAttribute('required'));
        /* ---------- Update status icon for the media upload custom select ---------- */
        updateStatusIcon(mediaUploadCustomSelect, uploadStatusIcon);
    }

    async function startCamera() {
        try {
            stopCamera();
            /* ---------- Request access to user's camera ---------- */
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.play();
            console.log("startCamera: Camera started successfully.");
        } catch (err) {
            console.error('startCamera: Error accessing camera:', err);
            alert('Cannot enable camera: ' + err.message + '\nPlease ensure you have a camera connected and allow access to it in your browser settings.');
            if (uploadSelect) uploadSelect.value = '';
            updateMediaUploadVisibility();
        }
    }

    function stopCamera() {
        if (stream) {
            /* ---------- Stop all video tracks to release camera ---------- */
            stream.getTracks().forEach(track => {
                track.stop();
                console.log("stopCamera: Camera track stopped.");
            });
            stream = null;
        }
        if (video) {
            video.srcObject = null;
            video.pause();
        }
        console.log("stopCamera: Camera stopped.");
    }

    /* ---------- Capture button event listeners to take photo from camera stream ---------- */
    if (captureButton) {
        captureButton.addEventListener('click', () => {
            if (!stream) {
                alert('No active camera stream to capture image.');
                return;
            }
            if (!canvas || !video) {
                console.error('Canvas or video element not found.');
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
                if (video) video.style.display = 'none';
                if (captureButton) captureButton.style.display = 'none';
                updateStatusIcon({ type: 'file', files: [capturedBlob] }, mediaFileStatusIcon);
            }, 'image/jpeg');
        });
    }

    /* ---------- Additional capture button listener with alert and image preview inside camera section ---------- */
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
                img.style.display = 'block'; // Ensure image is displayed separately
                const existingPreview = document.getElementById('capturedImagePreview');
                if (existingPreview) {
                    existingPreview.src = img.src;
                } else {
                    img.id = 'capturedImagePreview';
                    if (cameraSection) {
                        cameraSection.appendChild(img);
                    }
                }
                stopCamera();
                /* ---------- Keep video and captureButton visible since cameraSection remains visible ---------- */
                updateStatusIcon({ type: 'file', files: [capturedBlob] }, mediaFileStatusIcon);
            }, 'image/jpeg');
        });
    }

    /* ---------- Event listener for back button navigation ---------- */
    if (backButton) {
        backButton.addEventListener('click', (event) => {
            event.preventDefault();
            window.location.href = '/html/homePageCitizen.html';
        });
    }

    /* ---------- Custom select event listeners for fault type ---------- */
    if (faultTypeSelect) {
        faultTypeSelect.addEventListener('click', (e) => {
            e.stopPropagation();
            faultTypeSelect.classList.toggle('open');
            faultTypeSelect.setAttribute('aria-expanded', String(faultTypeSelect.classList.contains('open')));
        });
        /* ---------- Initial update of fault description requirement and status icon ---------- */
        updateFaultDescriptionRequirement();
        updateStatusIcon(faultTypeSelect, faultTypeStatusIcon);
    }

    /* ---------- Input listener for fault description textarea ---------- */
    if (faultDescriptionTextarea) {
        faultDescriptionTextarea.addEventListener('input', () => {
            updateStatusIcon(faultDescriptionTextarea, faultDescriptionStatusIcon);
        });
        updateStatusIcon(faultDescriptionTextarea, faultDescriptionStatusIcon);
    }

    /* ---------- Custom select event listeners for location selection ---------- */
    if (customLocationSelect) {
        locationSelectedDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            customLocationSelect.classList.toggle('open');
            customLocationSelect.setAttribute('aria-expanded', String(customLocationSelect.classList.contains('open')));
        });
        updateStatusIcon(customLocationSelect, locationStatusIcon);
    }

    /* ---------- Event listeners for city select using jQuery Select2 plugin ---------- */
    if (citySelect) {
        $(citySelect).on('select2:select', (e) => {
            const selectedCity = e.params.data.text.trim();
            console.log(`select2: Selected city: '${selectedCity}'`);
            loadStreetsForCity(selectedCity);
            updateStatusIcon(citySelect, cityStatusIcon);
        });
        citySelect.addEventListener('blur', () => {
            /* ---------- Trigger geocoding on blur if city and street selected ---------- */
            if (citySelect.value.trim() && streetSelect && streetSelect.value.trim()) {
                geocodeAddress(citySelect.value.trim(), streetSelect.value.trim(), houseNumberInput ? houseNumberInput.value.trim() : '');
            }
            updateStatusIcon(citySelect, cityStatusIcon);
        });
    }

    /* ---------- Event listeners for street select using jQuery Select2 plugin ---------- */
    if (streetSelect) {
        $(streetSelect).on('select2:select', () => {
            updateStatusIcon(streetSelect, streetStatusIcon);
            /* ---------- Trigger geocoding if city is also selected ---------- */
            if (citySelect && citySelect.value.trim() && streetSelect.value.trim()) {
                geocodeAddress(citySelect.value.trim(), streetSelect.value.trim(), houseNumberInput ? houseNumberInput.value.trim() : '');
            }
        });
        streetSelect.addEventListener('blur', () => {
            if (citySelect && citySelect.value.trim() && streetSelect.value.trim()) {
                geocodeAddress(citySelect.value.trim(), streetSelect.value.trim(), houseNumberInput ? houseNumberInput.value.trim() : '');
            }
            updateStatusIcon(streetSelect, streetStatusIcon);
        });
    }


        if (houseNumberInput) {
        /* ---------- Update status icon on house number input ---------- */
        houseNumberInput.addEventListener('input', () => {
            if (houseNumberStatusIcon) {
                updateStatusIcon(houseNumberInput, houseNumberStatusIcon);
            }
        });
        /* ---------- On blur, trigger geocoding if city and street are selected, update status icon ---------- */
        houseNumberInput.addEventListener('blur', () => {
            if (citySelect && citySelect.value.trim() && streetSelect && streetSelect.value.trim()) {
                geocodeAddress(citySelect.value.trim(), streetSelect.value.trim(), houseNumberInput.value.trim());
            }
            if (houseNumberStatusIcon) {
                updateStatusIcon(houseNumberInput, houseNumberStatusIcon);
            }
        });
    }

    // --- Event Listeners for custom media upload select ---
    if (mediaUploadCustomSelect) {
        mediaUploadSelectedDiv.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent immediate closing when clicking on the select
            mediaUploadCustomSelect.classList.toggle('open');
            mediaUploadCustomSelect.setAttribute('aria-expanded', String(mediaUploadCustomSelect.classList.contains('open')));
        });
        updateMediaUploadVisibility(); // Initial call to set visibility based on default/selected option
        updateStatusIcon(mediaUploadCustomSelect, uploadStatusIcon);
    }

    if (mediaFileInput) {
        /* ---------- Update status icon when user selects a file ---------- */
        mediaFileInput.addEventListener('change', () => {
            updateStatusIcon(mediaFileInput, mediaFileStatusIcon);
        });
        updateStatusIcon(mediaFileInput, mediaFileStatusIcon); // Initial update
    }

    // --- Form submission handling ---
    if (reportForm) {
        reportForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!reportForm.checkValidity() || !faultTypeSelected?.dataset.value || !locationSelectedDiv?.dataset.value || !mediaUploadSelectedDiv?.dataset.value) {
                alert('אנא מלא את כל השדות הנדרשים.');
                return;
            }

    /* ---------- Collect form data from custom selects and inputs ---------- */
    const faultType = faultTypeSelected.textContent.trim();
    const faultDescription = faultDescriptionTextarea.value.trim();
    const locationType = locationSelectedDiv.dataset.value;
    let locationData = {};

    if (locationType === 'loc2') { // Manual address input
        /* ---------- If lat/lon null, attempt geocoding before submit ---------- */
        if (manualLat === null || manualLon === null) {
            const geocoded = await geocodeAddress(citySelect.value.trim(), streetSelect.value.trim(), houseNumberInput.value.trim());
            if (!geocoded) {
                alert('לא ניתן לשלוח דיווח. לא ניתן לקבוע קואורדינטות עבור הכתובת הידנית. אנא בדוק את הכתובת ונסה שוב.');
                return;
            }
        }
        /* ---------- Compose location details object for manual address ---------- */
        locationData = {
            type: 'manual',
            city: citySelect.value.trim(),
            street: streetSelect.value.trim(),
            houseNumber: houseNumberInput.value.trim(),
            latitude: manualLat,
            longitude: manualLon,
            address: manualFullAddress || `${houseNumberInput.value.trim()} ${streetSelect.value.trim()}, ${citySelect.value.trim()}`
        };
    } else if (locationType === 'loc1') { // Current detected location
        /* ---------- Validate current location coordinates before submit ---------- */
        if (currentLat === null || currentLon === null) {
            alert('לא ניתן לשלוח דיווח. המיקום הנוכחי לא זוהה. אנא נסה שוב או בחר במיקום ידני.');
            return;
        }
        /* ---------- Compose location details object for current location ---------- */
        locationData = {
            type: 'current',
            city: currentCity || '',
            latitude: currentLat,
            longitude: currentLon,
            address: locationString || ''
        };
    } else { // No location type selected
        alert('אנא בחר סוג מיקום.');
        return;
    }

    const uploadOption = mediaUploadSelectedDiv.dataset.value;
    let mediaToUpload = null;

    if (uploadOption === 'option1') { // Camera capture
        if (capturedBlob) {
            /* ---------- Convert captured blob to File object for upload ---------- */
            mediaToUpload = new File([capturedBlob], 'captured_image.jpeg', { type: 'image/jpeg' });
        } else {
            alert('לא צולמה תמונה. אנא צלם תמונה או בחר באפשרות אחרת.');
            return;
        }
    } else if (uploadOption === 'option2') { // File upload from media library
        if (mediaFileInput.files.length > 0) {
            mediaToUpload = mediaFileInput.files[0];
        } else {
            alert('אנא בחר קובץ תמונה/וידאו מספריית המדיה שלך.');
            return;
        }
    } else { // No media upload option selected
        alert('אנא בחר אפשרות להעלאת מדיה (מצלמה או ספריית תמונות).');
        return;
    }

    /* ---------- Prepare FormData object to send to backend ---------- */
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

    console.log('Prepared report data for submission:', {
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
        /* ---------- Debug logging FormData contents ---------- */
        console.log('[Client] mediaToUpload:', mediaToUpload);
        console.log('[Client] mediaToUpload name:', mediaToUpload?.name);
        console.log('[Client] mediaToUpload size:', mediaToUpload?.size);
        console.log('[Client] mediaToUpload type:', mediaToUpload?.type);

        for (const pair of formData.entries()) {
            console.log(pair[0] + ': ' + pair[1]);
        }

        /* ---------- Send POST request to API endpoint with form data ---------- */
        const res = await fetch(`${API_BASE_URL}/api/reports`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (res.ok) {
            console.log('Report submitted successfully:', data.message);

            /* ---------- Prepare display string for location ---------- */
            let displayLocation = '';
            if (locationType === 'loc1') {
                displayLocation = locationString || `המיקום הנוכחי שלך (קו רוחב: ${currentLat}, קו אורך: ${currentLon})`;
            } else if (locationType === 'loc2') {
                displayLocation = `עיר: ${citySelect.value} , רחוב: ${streetSelect.value} ,`;
                if (houseNumberInput.value) {
                    displayLocation += ` מספר בית: ${houseNumberInput.value}`;
                }
            }

            /* ---------- Store last report details in localStorage for next page ---------- */
            localStorage.setItem('lastReportDetails', JSON.stringify({
                faultTypeLabel: faultTypeSelected ? faultTypeSelected.textContent.trim() : '',
                faultDescription: faultDescription,
                location: displayLocation,
                timestamp: new Date().toISOString(),
                mediaId: data.mediaId || data.report?.media || 'no media',
                mediaMimeType: data.mediaMimeType || null
            }));
            localStorage.setItem('lastReportId', data.reportId || data._id);

            alert('הדיווח נשלח בהצלחה!');
            window.location.href = '/html/reportReceivedPage.html';
        } else {
            alert('שגיאה בשליחת דיווח: ' + data.message);
        }
        } catch (error) {
            console.error('Error sending report:', error);
            alert('אירעה שגיאה בעת שליחת הדיווח. אנא נסה שוב מאוחר יותר.');
        }
    });
}

    // --- Initial data loading ---
    // Ensure user is logged in before continuing with async loads
    if (loggedInUser) {
        currentUsername = loggedInUser.username;
        currentUserId = loggedInUser.userId;
        console.log('User logged in:', currentUsername, 'ID:', currentUserId);
    } else {
        console.warn('No logged-in user found in localStorage. Redirecting...');
        alert('שגיאה: משתמש לא מחובר. אנא התחבר שוב.');
        window.location.href = '../index.html';
        return; // Stop execution if no user
    }

    // Load data for all custom selects asynchronously
    await loadCities();
    await loadFaultTypes();
    await loadLocationModes();
    await loadMediaOptions(); // Load options for new custom media upload select

    // Initial icon updates for all elements after loading
    updateStatusIcon(faultTypeSelect, faultTypeStatusIcon);
    updateStatusIcon(faultDescriptionTextarea, faultDescriptionStatusIcon);
    updateStatusIcon(customLocationSelect, locationStatusIcon);
    updateStatusIcon(citySelect, cityStatusIcon);
    updateStatusIcon(streetSelect, streetStatusIcon);
    updateStatusIcon(houseNumberInput, houseNumberStatusIcon);
    updateStatusIcon(mediaUploadCustomSelect, uploadStatusIcon);
    updateStatusIcon(mediaFileInput, mediaFileStatusIcon);

    // Add global document listener to close custom selects on outside click
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
}); // End of DOMContentLoaded
