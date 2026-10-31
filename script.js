document.addEventListener('DOMContentLoaded', async () => {
  const companyDetails = window.CaintaOneData.company;
  const API_BASE = window.CAINTA_API_BASE || window.location.origin;

  const formatApiError = (value) => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      return value.map((issue) => {
        if (typeof issue === 'string') return issue;
        if (!issue || typeof issue !== 'object') return String(issue);
        const path = Array.isArray(issue.path) ? issue.path.join('.') : '';
        const detail = typeof issue.message === 'string' ? issue.message : JSON.stringify(issue);
        return path ? `${path}: ${detail}` : detail;
      }).filter(Boolean).join('; ');
    }
    if (value && typeof value === 'object') {
      const detail = value.message ?? value.error;
      return detail === undefined ? JSON.stringify(value) : formatApiError(detail);
    }
    return String(value);
  };

    async function api(path, options = {}) {
    let token = null;
    try {
      token = JSON.parse(localStorage.getItem('coe-demo-session-v1') || 'null')?.token || null;
    } catch {
      token = null;
    }
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      let message = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(body);
        message = formatApiError(parsed.error ?? parsed.message ?? message);
      } catch {
        if (body) message = body.slice(0, 200);
      }
      const error = new Error(message);
      error.status = res.status;
      if (res.status === 401 && message === 'Invalid or expired token') {
        localStorage.removeItem('coe-demo-session-v1');
        window.dispatchEvent(new CustomEvent('coe-auth-expired'));
      }
      throw error;
    }
    return res.json();
  }

  document.querySelectorAll('[data-location]').forEach((el) => {
    el.textContent = companyDetails.location;
  });

  document.querySelectorAll('[data-phone]').forEach((el) => {
    el.textContent = companyDetails.phone;
  });

  document.querySelectorAll('[data-email]').forEach((el) => {
    el.textContent = companyDetails.email;
    el.setAttribute('href', `mailto:${companyDetails.email}`);
  });

  const yearTarget = document.querySelector('[data-year]');
  if (yearTarget) {
    yearTarget.textContent = new Date().getFullYear();
  }

  document.querySelectorAll('[data-password-target]').forEach((button) => {
    const input = document.getElementById(button.dataset.passwordTarget);
    if (!input) return;
    button.addEventListener('click', () => {
      const revealing = input.type === 'password';
      input.type = revealing ? 'text' : 'password';
      button.textContent = revealing ? 'Hide' : 'Show';
      button.setAttribute('aria-pressed', String(revealing));
      button.setAttribute('aria-label', `${revealing ? 'Hide' : 'Show'} ${input.labels[0]?.textContent.toLowerCase() || 'password'}`);
    });
  });

  const accountStorageKey = 'coe-demo-account-v1';
  const sessionStorageKey = 'coe-demo-session-v1';
  const profileStorageKey = 'coe-demo-profile-v1';
  const readLocalRecord = (key) => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  };
  const getUserProfile = (account = {}) => {
    const profile = readLocalRecord(profileStorageKey);
    return profile || {
      name: account.name || '',
      address: '',
      orderUpdates: true
    };
  };
  const saveUserProfile = (profile) => {
    const currentAccount = readLocalRecord(accountStorageKey);
    const normalizedProfile = {
      name: profile.name.trim(),
      address: profile.address.trim(),
      orderUpdates: Boolean(profile.orderUpdates)
    };
    localStorage.setItem(profileStorageKey, JSON.stringify(normalizedProfile));
    if (currentAccount) {
      currentAccount.name = normalizedProfile.name;
      localStorage.setItem(accountStorageKey, JSON.stringify(currentAccount));
    }
    const currentSession = readLocalRecord(sessionStorageKey);
    if (currentSession) {
      currentSession.name = normalizedProfile.name;
      localStorage.setItem(sessionStorageKey, JSON.stringify(currentSession));
    }
    window.dispatchEvent(new CustomEvent('coe-profile-updated', { detail: normalizedProfile }));
    return normalizedProfile;
  };

  const navSignIn = document.getElementById('nav-sign-in');
  const userMenu = document.getElementById('user-menu');
  const userMenuTrigger = document.getElementById('user-menu-trigger');
  const userMenuPanel = document.getElementById('user-menu-panel');
  const userProfileForm = document.getElementById('user-profile-form');
  const userProfileMessage = document.getElementById('user-profile-message');
  const renderHeaderUser = () => {
    if (!userMenu || !navSignIn) return;
    try {
      const session = readLocalRecord(sessionStorageKey);
      navSignIn.hidden = Boolean(session?.email);
      userMenu.hidden = !session?.email;
      if (!session?.email) return;
      const profile = getUserProfile(session);
      document.getElementById('user-menu-name').textContent = profile.name || 'My account';
      document.getElementById('user-avatar').textContent = (profile.name || 'U').trim().charAt(0).toLocaleUpperCase();
      document.getElementById('user-menu-email').textContent = session.email;
      document.getElementById('user-profile-name').value = profile.name;
      document.getElementById('user-profile-address').value = profile.address;
      document.getElementById('user-order-updates').checked = profile.orderUpdates;
    } catch (error) {
      console.error('Could not load the signed-in profile.', error);
      if (userProfileMessage) userProfileMessage.textContent = 'Could not load your saved profile. Please reopen your account settings.';
    }
  };
  renderHeaderUser();
  userMenuTrigger?.addEventListener('click', () => {
    const opening = userMenuPanel.hidden;
    userMenuPanel.hidden = !opening;
    userMenuTrigger.setAttribute('aria-expanded', String(opening));
  });
  document.addEventListener('click', (event) => {
    if (userMenu && !userMenu.hidden && !userMenu.contains(event.target)) {
      userMenuPanel.hidden = true;
      userMenuTrigger.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && userMenuPanel && !userMenuPanel.hidden) {
      userMenuPanel.hidden = true;
      userMenuTrigger.setAttribute('aria-expanded', 'false');
      userMenuTrigger.focus();
    }
  });
  userProfileForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const values = new FormData(userProfileForm);
      const profile = saveUserProfile({
        name: values.get('name')?.toString() || '',
        address: values.get('address')?.toString() || '',
        orderUpdates: values.has('orderUpdates')
      });
      if (userProfileMessage) {
        userProfileMessage.textContent = 'Profile and settings saved.';
        userProfileMessage.classList.remove('is-error');
      }
      document.getElementById('user-menu-name').textContent = profile.name;
      document.getElementById('user-avatar').textContent = profile.name.charAt(0).toLocaleUpperCase();
    } catch (error) {
      if (userProfileMessage) {
        userProfileMessage.textContent = `Could not save your profile: ${error.message}`;
        userProfileMessage.classList.add('is-error');
      }
    }
  });
  document.getElementById('user-sign-out')?.addEventListener('click', () => {
    try {
      localStorage.removeItem(sessionStorageKey);
      userMenuPanel.hidden = true;
      userMenuTrigger.setAttribute('aria-expanded', 'false');
      renderHeaderUser();
    } catch (error) {
      if (userProfileMessage) userProfileMessage.textContent = `Could not sign out: ${error.message}`;
    }
  });
  window.addEventListener('coe-profile-updated', renderHeaderUser);
  window.addEventListener('storage', (event) => {
    if ([sessionStorageKey, profileStorageKey].includes(event.key)) renderHeaderUser();
  });

    const accountForm = document.getElementById('account-form');
  if (accountForm) {
    const accountModes = document.querySelectorAll('[data-account-mode]');
    const nameField = document.getElementById('account-name-field');
    const nameInput = document.getElementById('account-name');
    const emailInput = document.getElementById('account-email');
    const sendCodeButton = document.getElementById('account-send-code');
    const codeField = document.getElementById('account-code-field');
    const codeInput = document.getElementById('account-code');
    const phoneField = document.getElementById('account-phone-field');
    const phoneInput = document.getElementById('account-phone');
    const passwordInput = document.getElementById('account-password');
    const confirmPasswordField = document.getElementById('account-confirm-password-field');
    const confirmPasswordInput = document.getElementById('account-confirm-password');
    const accountMessage = document.getElementById('account-message');
    const accountPanel = document.getElementById('account-panel');
    const accountFormPanel = document.getElementById('account-form-panel');
    const accountNameDisplay = document.getElementById('account-name-display');
    const accountEmailDisplay = document.getElementById('account-email-display');
    const signOutButton = document.getElementById('account-sign-out');
    const profileForm = document.getElementById('account-profile-form');
    const profileMessage = document.getElementById('account-profile-message');
    const accountProfileName = document.getElementById('account-profile-name');
    const accountProfileAddress = document.getElementById('account-profile-address');
    const accountOrderUpdates = document.getElementById('account-order-updates');
    

    let accountMode = new URLSearchParams(window.location.search).get('mode') === 'create'
      ? 'create'
      : 'signin';
    let verificationEmail = '';

    const setAccountMessage = (message, isError = false) => {
      accountMessage.textContent = message;
      accountMessage.classList.toggle('is-error', isError);
    };

    const readSession = () => {
      try {
        return JSON.parse(localStorage.getItem(sessionStorageKey) || 'null');
      } catch {
        return null;
      }
    };

    const renderAccountMode = () => {
      const creating = accountMode === 'create';
      nameField.hidden = !creating;
      nameInput.required = creating;
      phoneField.hidden = !creating;
      phoneInput.required = false;
      confirmPasswordField.hidden = !creating;
      confirmPasswordInput.required = creating;
      confirmPasswordInput.autocomplete = creating ? 'new-password' : 'off';
      passwordInput.autocomplete = creating ? 'new-password' : 'current-password';
      sendCodeButton.hidden = !creating;
      codeField.hidden = !creating || !verificationEmail;
      codeInput.required = creating && Boolean(verificationEmail);
      document.getElementById('account-submit').textContent = creating ? 'Create Account' : 'Sign In';
      document.getElementById('account-heading').textContent = creating ? 'Create your account' : 'Welcome back';
      document.getElementById('account-intro').textContent = creating
        ? 'Use one account for your Cainta One Express requests.'
        : 'Sign in to your Cainta One Express account.';
      accountModes.forEach((button) => {
        const selected = button.dataset.accountMode === accountMode;
        button.setAttribute('aria-pressed', String(selected));
      });
      setAccountMessage('');
    };

    accountModes.forEach((button) => {
      button.addEventListener('click', () => {
        accountMode = button.dataset.accountMode;
        renderAccountMode();
      });
    });

    emailInput.addEventListener('input', () => {
      const email = emailInput.value.trim().toLowerCase();
      if (verificationEmail && email !== verificationEmail) {
        verificationEmail = '';
        codeInput.value = '';
        codeField.hidden = true;
        codeInput.required = false;
        setAccountMessage('Email changed. Send a new verification code.');
      }
    });

    sendCodeButton.addEventListener('click', async () => {
      const email = emailInput.value.trim().toLowerCase();
      if (!emailInput.checkValidity()) {
        emailInput.reportValidity();
        return;
      }

      sendCodeButton.disabled = true;
      sendCodeButton.textContent = 'Sending...';
      verificationEmail = '';
      codeInput.value = '';
      codeField.hidden = true;
      codeInput.required = false;
      try {
        await api('/api/otp/send', { method: 'POST', body: JSON.stringify({ email }) });
        verificationEmail = email;
        codeField.hidden = false;
        codeInput.required = true;
        setAccountMessage('Verification code sent. Enter it below to create your account.');
        codeInput.focus();
      } catch (error) {
        setAccountMessage(error.message || 'Could not send a verification code.', true);
      } finally {
        sendCodeButton.disabled = false;
        sendCodeButton.textContent = 'Send Email Code';
      }
    });

    const showSignedInAccount = (session) => {
      accountNameDisplay.textContent = session.name || 'Account';
      accountEmailDisplay.textContent = session.email;
      const profile = getUserProfile(session);
      accountProfileName.value = profile.name;
      accountProfileAddress.value = profile.address;
      accountOrderUpdates.checked = profile.orderUpdates;
      accountFormPanel.hidden = true;
      accountPanel.hidden = false;
    };

    accountForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitButton = document.getElementById('account-submit');
      submitButton.disabled = true;
      const creating = accountMode === 'create';
      setAccountMessage(creating ? 'Creating your account...' : 'Signing you in...');

      try {
        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        if (creating && !verificationEmail) {
          throw new Error('Send a verification code before creating your account.');
        }
        if (creating && verificationEmail !== email) {
          throw new Error('Email changed. Send a new verification code.');
        }
        if (creating && password !== confirmPasswordInput.value) {
          confirmPasswordInput.setCustomValidity('Passwords do not match.');
          confirmPasswordInput.reportValidity();
          throw new Error('Passwords do not match.');
        }
        confirmPasswordInput.setCustomValidity('');

        const endpoint = creating ? '/api/auth/register' : '/api/auth/login';
        const payload = creating
          ? {
              email,
              password,
              full_name: nameInput.value.trim(),
              phone: phoneInput.value.trim() || null,
              otp_code: codeInput.value.trim(),
            }
          : { email, password };

        const data = await api(endpoint, {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        const session = {
          token: data.access_token,
          email: data.user.email,
          name: data.user.full_name || data.user.email,
        };
        localStorage.setItem(sessionStorageKey, JSON.stringify(session));
        if (creating || !readLocalRecord(profileStorageKey)) {
          saveUserProfile({
            name: session.name,
            address: '',
            orderUpdates: true,
          });
        }
        showSignedInAccount(session);
        setAccountMessage(creating ? 'Account created. You are signed in.' : 'You are signed in.');
      } catch (error) {
        setAccountMessage(error.message || 'We could not complete that request.', true);
      } finally {
        submitButton.disabled = false;
      }
    });

    confirmPasswordInput.addEventListener('input', () => {
      confirmPasswordInput.setCustomValidity(
        confirmPasswordInput.value && confirmPasswordInput.value !== passwordInput.value
          ? 'Passwords do not match.'
          : ''
      );
    });
    passwordInput.addEventListener('input', () => {
      confirmPasswordInput.setCustomValidity(
        confirmPasswordInput.value && confirmPasswordInput.value !== passwordInput.value
          ? 'Passwords do not match.'
          : ''
      );
    });

    profileForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      try {
        const values = new FormData(profileForm);
        const profile = saveUserProfile({
          name: values.get('name')?.toString() || '',
          address: values.get('address')?.toString() || '',
          orderUpdates: values.has('orderUpdates'),
        });
        accountNameDisplay.textContent = profile.name;
        if (profileMessage) {
          profileMessage.textContent = 'Profile and settings saved.';
          profileMessage.classList.remove('is-error');
        }
      } catch (error) {
        if (profileMessage) {
          profileMessage.textContent = `Could not save your profile: ${error.message}`;
          profileMessage.classList.add('is-error');
        }
      }
    });

    signOutButton?.addEventListener('click', () => {
      localStorage.removeItem(sessionStorageKey);
      accountPanel.hidden = true;
      accountFormPanel.hidden = false;
      accountForm.reset();
      verificationEmail = '';
      accountMode = 'signin';
      renderAccountMode();
    });

    const existing = readSession();
    if (existing?.email) {
      showSignedInAccount(existing);
    }
    renderAccountMode();
  }

  const navLinks = document.querySelectorAll('.nav-menu a');
  const sections = [...document.querySelectorAll('main section[id]')];

  const updateActiveNav = () => {
    let currentSection = 'home';

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 150 && rect.bottom >= 150) {
        currentSection = section.id;
      }
    });

    navLinks.forEach((link) => {
      const isActive = link.getAttribute('href') === `#${currentSection}`;
      link.classList.toggle('active', isActive);
    });
  };

  updateActiveNav();
  window.addEventListener('scroll', updateActiveNav, { passive: true });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const quoteButtons = document.querySelectorAll('[data-quote]');
  quoteButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  const statusText = document.querySelector('[data-status]');
  if (statusText) {
    statusText.textContent = 'Serving Cainta, Rizal';
  }

  const sellModal = document.getElementById('sell-modal');
  const sellModalDialog = sellModal?.querySelector('.sell-modal-dialog');
  const bazaarShopModal = document.getElementById('bazaar-shop-modal');
  const bazaarShopForm = document.getElementById('bazaar-shop-form');
  const bazaarProductForm = document.getElementById('bazaar-product-form');
  const bazaarListingMessage = document.getElementById('bazaar-listing-message');
  const bazaarShopMessage = document.getElementById('bazaar-shop-message');
  const bazaarShopAuthMessage = document.getElementById('bazaar-shop-auth-message');
  const bazaarShopProducts = document.getElementById('bazaar-shop-products');
  const bazaarShopItemList = document.getElementById('bazaar-shop-item-list');
  const bazaarShopEmpty = document.getElementById('bazaar-shop-empty');
  const bazaarShopPhoto = document.getElementById('bazaar-shop-photo');
  const bazaarShopPhotoPreview = document.getElementById('bazaar-shop-photo-preview');
  const bazaarProductPhotos = document.getElementById('listing-photos');
  const bazaarProductPhotoPreviews = document.getElementById('listing-photo-previews');
  const bazaarProductDetailsModal = document.getElementById('bazaar-product-details-modal');
  const bazaarProductGallery = document.getElementById('bazaar-product-gallery');
  const bazaarSellerShopModal = document.getElementById('bazaar-seller-shop-modal');
  const bazaarSellerShopProducts = document.getElementById('bazaar-seller-shop-products');
  let bazaarSellerShopTrigger = null;
  let bazaarShop = null;
  let bazaarShopProductsData = [];
  let pendingBazaarShopPhoto = '';
  let pendingBazaarProductPhotos = [];
  let bazaarShopPhotoProcessing = false;
  let bazaarPhotosProcessing = false;
  let bazaarProductDetailsTrigger = null;
  const setBazaarListingMessage = (message, isError = false) => {
    if (!bazaarListingMessage) return;
    bazaarListingMessage.textContent = message;
    bazaarListingMessage.classList.toggle('is-error', isError);
  };
  const setBazaarShopMessage = (message, isError = false) => {
    if (!bazaarShopMessage) return;
    bazaarShopMessage.textContent = message;
    bazaarShopMessage.classList.toggle('is-error', isError);
  };
  const sellTitle = document.getElementById('sell-modal-title');
  const sellSubtitle = document.getElementById('sell-modal-subtitle');
  const sellServiceField = document.getElementById('sell-service');
  const sellForm = document.getElementById('sell-form');
  const sellSuccess = document.getElementById('sell-success');
  const orderAuthPrompt = document.getElementById('order-auth-prompt');
  const orderAuthContinue = document.getElementById('order-auth-continue');
  const orderAuthBack = document.getElementById('order-auth-back');
  const orderAuthMessage = document.getElementById('order-auth-message');
  window.addEventListener('coe-auth-expired', () => {
    renderHeaderUser();
    if (orderAuthPrompt) {
      orderAuthPrompt.hidden = false;
      if (orderAuthMessage) {
        orderAuthMessage.textContent = 'Your sign-in expired. Sign in again in the new tab, then return here and continue.';
      }
    }
    if (deliveryEstimateStatus) {
      deliveryEstimateStatus.textContent = 'Your sign-in expired. The route can be estimated, but tracking needs you to sign in again.';
    }
  });
  const itemSearch = document.getElementById('item-search');
  const itemName = document.getElementById('item-name');
  const itemPrice = document.getElementById('item-price');
  const bazaarItemFields = document.getElementById('bazaar-item-fields');
  const bazaarFlowSteps = document.getElementById('bazaar-flow-steps');
  const bazaarViewCartButton = document.getElementById('bazaar-view-cart-button');
  const bazaarBackToBrowseButton = document.getElementById('bazaar-back-to-browse');
  const bazaarCheckoutButton = document.getElementById('bazaar-checkout-button');
  const bazaarCheckoutFields = document.getElementById('bazaar-checkout-fields');
  const bazaarBackToCartButton = document.getElementById('bazaar-back-to-cart');
  const foodCart = document.getElementById('food-cart');
  const foodCartItems = document.getElementById('food-cart-items');
  const foodCartTitle = document.getElementById('food-cart-title');
  const foodCartCount = document.getElementById('food-cart-count');
  const foodCartEmpty = document.getElementById('food-cart-empty');
  const foodCartTotal = document.getElementById('food-cart-total');
  const itemCategory = document.getElementById('item-category');
  const itemRestaurant = document.getElementById('item-restaurant');
  const itemFinder = document.querySelector('.item-finder');
  const foodCheckoutFields = document.getElementById('food-checkout-fields');
  const restaurantPicker = document.getElementById('food-restaurant-picker');
  const restaurantList = document.getElementById('food-restaurant-list');
  const selectedRestaurantPanel = document.getElementById('food-selected-restaurant');
  const selectedRestaurantName = document.getElementById('food-selected-name');
  const selectedRestaurantLocation = document.getElementById('food-selected-location');
  const changeRestaurantButton = document.getElementById('food-change-restaurant');
  const itemSuggestions = document.getElementById('item-suggestions');
  const itemCategories = document.getElementById('item-categories');
  const itemSuggestionList = document.getElementById('item-suggestion-list');
  const itemSuggestionsLabel = document.getElementById('item-suggestions-label');
  const itemSearchStatus = document.getElementById('item-search-status');
  const bazaarSelectedSeller = document.getElementById('bazaar-selected-seller');
  const deliveryAddress = document.getElementById('delivery-address');
  const deliveryAddressSuggestions = document.getElementById('delivery-address-suggestions');
  const useGpsButton = document.getElementById('use-gps-btn');
  const pinMapButton = document.getElementById('pin-map-btn');
  const pinMapContainer = document.getElementById('map-pin-container');
  const deliveryEstimate = document.getElementById('delivery-estimate');
  const deliveryEstimateTitle = document.getElementById('delivery-estimate-title');
  const deliveryEstimateSummary = document.getElementById('delivery-estimate-summary');
  const deliveryEstimateStatus = document.getElementById('delivery-estimate-status');
  const deliveryAddressPreview = document.getElementById('delivery-address-preview');
  const deliveryBarangayField = document.getElementById('delivery-barangay-field');
  const deliveryBarangaySelect = document.getElementById('delivery-barangay');
  const setDeliveryAddressFeedback = (message, state = 'info') => {
    if (!deliveryAddressPreview) return;
    deliveryAddressPreview.textContent = message;
    deliveryAddressPreview.dataset.state = state;
  };
  const deliveryMapLink = document.getElementById('delivery-map-link');
  const deliveryProgress = document.getElementById('delivery-progress');
  const deliveryProgressBar = document.getElementById('delivery-progress-bar');
  const paymentDemoNote = document.getElementById('payment-demo-note');
  const sellSubmit = sellForm?.querySelector('[type="submit"]');
  const caintaAreas = {
    Junction: { label: 'Cainta Junction', lat: 14.5785, lon: 121.1130 },
    'San Isidro': { label: 'San Isidro', lat: 14.5835, lon: 121.1110 },
    Brookside: { label: 'Brookside', lat: 14.5812, lon: 121.1048 },
    'Sto. Domingo': { label: 'Sto. Domingo', lat: 14.6000, lon: 121.1090 },
    Karangalan: { label: 'Karangalan', lat: 14.6280, lon: 121.1080 }
  };
  const caintaBounds = [[14.547851, 121.0946307], [14.6365632, 121.1450774]];
  const caintaBoundary = [
    [
      [121.0946307, 14.5690387], [121.0962712, 14.5648727], [121.0958435, 14.5640881],
      [121.0980236, 14.5624516], [121.0962866, 14.5602645], [121.0981695, 14.558572],
      [121.0980692, 14.5547713], [121.0992397, 14.5533099], [121.1011906, 14.5535188],
      [121.1086074, 14.547851], [121.1126729, 14.5509639], [121.1187759, 14.5632903],
      [121.119746, 14.562942], [121.1204038, 14.5662268], [121.1231111, 14.5659041],
      [121.1240439, 14.5719457], [121.1261957, 14.5767014], [121.1272414, 14.5757423],
      [121.1295629, 14.5773208], [121.130914, 14.5802699], [121.1321265, 14.5808855],
      [121.1289414, 14.5821335], [121.1314782, 14.586233], [121.1325488, 14.5863618],
      [121.1338712, 14.5848022], [121.1348771, 14.5867771], [121.1372034, 14.5864329],
      [121.1407065, 14.5884534], [121.1413994, 14.5878034], [121.1426031, 14.5881594],
      [121.1448134, 14.590336], [121.142893, 14.5913662], [121.1450774, 14.5913474],
      [121.1449832, 14.5932865], [121.1382875, 14.5933442], [121.1372474, 14.590768],
      [121.1364288, 14.5909458], [121.1363839, 14.5980364], [121.1337001, 14.5960683],
      [121.1316067, 14.5966988], [121.1255997, 14.593682], [121.1201664, 14.5933327],
      [121.1199035, 14.5958915], [121.1166713, 14.5961254], [121.1159988, 14.5989518],
      [121.1172442, 14.6004727], [121.1172598, 14.6036106], [121.1162136, 14.6041432],
      [121.1160738, 14.6060078], [121.1176546, 14.6091557], [121.1196454, 14.6081613],
      [121.120253, 14.6065483], [121.1229038, 14.6057579], [121.1248643, 14.60618],
      [121.127116, 14.605522], [121.1272646, 14.6072179], [121.1292958, 14.6080296],
      [121.1305576, 14.6069751], [121.1310385, 14.6092595], [121.1327925, 14.6118019],
      [121.1311173, 14.6119826], [121.1308254, 14.61474], [121.125004, 14.6141492],
      [121.121052, 14.6159112], [121.1157596, 14.6153641], [121.1124769, 14.6126812],
      [121.1117805, 14.6141865], [121.1071233, 14.61703], [121.1062307, 14.6198787],
      [121.1011321, 14.6203623], [121.1009287, 14.6186568], [121.0987248, 14.6188825],
      [121.0987089, 14.6166237], [121.1018279, 14.6160696], [121.1057649, 14.6034423],
      [121.1058252, 14.6008033], [121.1034621, 14.6004132], [121.1029354, 14.5974769],
      [121.1084271, 14.5931151], [121.1103043, 14.5941063], [121.1110273, 14.5910769],
      [121.1083586, 14.5871533], [121.1081808, 14.5838964], [121.1091205, 14.581177],
      [121.1083613, 14.5793694], [121.101526, 14.5753659], [121.1009791, 14.5733309],
      [121.0983364, 14.5700121], [121.0946307, 14.5690387]
    ],
    [
      [121.1038137, 14.62684], [121.1048565, 14.6234703], [121.1044143, 14.6224159],
      [121.1063623, 14.6206824], [121.1063996, 14.6216519], [121.1076277, 14.6219017],
      [121.1105694, 14.6324577], [121.111783, 14.6321712], [121.111763, 14.6361556],
      [121.1086394, 14.6365632], [121.1077735, 14.6359908], [121.1054168, 14.6326782],
      [121.1054762, 14.6303872], [121.1038137, 14.62684]
    ]
  ];
  const isInsideCainta = (lon, lat) => caintaBoundary.some((ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      const crossesLatitude = (yi > lat) !== (yj > lat);
      if (crossesLatitude && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  });
  let deliveryMap = null;
  let deliveryDriverMarker = null;
  let deliverySimulationTimer = null;
  let latestDelivery = null;
  let selectedRestaurant = null;
  let foodCartContents = [];
  let sellIsFoodOrder = false;
  let bazaarCheckoutStarted = false;
  let bazaarCurrentStep = 'browse';
  // ---- Search items -------------------------------------------------------
  // Food Express entries are menu picks. Use the restaurant as the category chip.
  // Add or update menu picks here to match the restaurants and menus you offer.
  //   item(menu item, restaurant, form Category dropdown, other words people may type, popular?)
  const { normalizeItemText, item } = window.CaintaOneData;
  const FALLBACK_CATALOG = {
    'Food Express': window.CaintaOneData.foodCatalog,
    'Online Bazaar': window.CaintaOneData.bazaarCatalog
  };
  let itemCatalog = { 'Food Express': [], 'Online Bazaar': [] };

  const bazaarListingStorageKey = 'cainta-bazaar-listings';
  let bazaarListings = [];
  try {
    const savedListings = localStorage.getItem(bazaarListingStorageKey);
    if (savedListings) {
      const parsedListings = JSON.parse(savedListings);
      if (!Array.isArray(parsedListings)) throw new Error('Saved product listings are not a list.');
      bazaarListings = parsedListings.filter((listing) =>
        listing &&
        typeof listing.id === 'string' &&
        typeof listing.name === 'string' &&
        typeof listing.category === 'string' &&
        typeof listing.seller === 'string' &&
        Number.isFinite(Number(listing.price)) &&
        Number.isFinite(Number(listing.stock)) &&
        typeof listing.description === 'string'
      );
      if (bazaarListings.length !== parsedListings.length) {
        throw new Error('One or more saved product listings have invalid data.');
      }
    }
  } catch (error) {
    console.error('Could not load saved Bazaar product listings.', error);
  }
  bazaarListings.forEach((listing) => {
    const group = ['Clothing', 'Shoes', 'Bags', 'Accessories'].includes(listing.category)
      ? 'Fashion'
      : listing.category === 'Home' ? 'Home' : 'Other';
    const entry = item(
      listing.name,
      listing.category,
      group,
      listing.description,
      true,
      Number(listing.price),
      listing.seller
    );
    entry.photo = typeof listing.photo === 'string' ? listing.photo : '';
    entry.photos = Array.isArray(listing.photos) ? listing.photos : entry.photo ? [entry.photo] : [];
    entry.stock = Number(listing.stock);
    entry.description = listing.description;
    entry.sellerArea = listing.area || '';
    entry.listingId = listing.id;
    itemCatalog['Online Bazaar'].push(entry);
  });

  const { bazaarPhotoGroups, bazaarCategoryPhotos } = window.CaintaOneData.images;
  const bazaarCategoryPhotoOverrides = window.CaintaOneData.images.bazaarCategoryPhotoOverrides || {};
  const bazaarProductPhoto = (entry) => {
    const name = entry.name.toLocaleLowerCase();
    const category = entry.category === 'Fashion' ? 'Clothing' : entry.category;
    const group = bazaarPhotoGroups.find((photoGroup) =>
      photoGroup.category === category && photoGroup.match.test(name)
    );
    const categoryOverride = bazaarCategoryPhotoOverrides[category];
    const photos = categoryOverride?.length
      ? categoryOverride
      : group?.photos || bazaarCategoryPhotos[category];
    if (!photos?.length) return null;

    const stableIndex = [...entry.name].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7);
    return productPhoto(photos[stableIndex % photos.length], `Representative product photo for ${entry.name}`);
  };

  const restaurants = window.CaintaOneData.images.restaurants;
  const catalogImagePath = (photo) => {
    const normalizedPhoto = photo.replace(/\\/g, '/');
    return normalizedPhoto.startsWith('photo-')
      ? `images/${normalizedPhoto}.png`
      : normalizedPhoto;
  };
  const foodPhoto = catalogImagePath;
    // Maps a product row from the API to the shape the search/suggestion code expects.
  const apiItemToEntry = (row) => {
    const group =
      row.category === 'Food' ? 'Food'
      : row.category === 'Home' ? 'Home'
      : row.category === 'Other' ? 'Other'
      : 'Fashion';
    return {
      listingId: row.id,
      name: row.name,
      category: row.category === 'Food' ? row.merchant : row.category,
      group,
      popular: false,
      price: row.price !== null ? Number(row.price) : null,
      seller: group === 'Fashion' || group === 'Home' || group === 'Other'
        ? row.merchant || ''
        : '',
      photo: Array.isArray(row.photos) && typeof row.photos[0] === 'string'
        ? row.photos[0]
        : '',
      description: row.description || '',
      stock: row.stock !== null && row.stock !== undefined && Number.isFinite(Number(row.stock))
        ? Number(row.stock)
        : null,
      photos: Array.isArray(row.photos) ? row.photos : [],
      sellerArea: row.seller_area || '',
      sellerDescription: row.seller_description || '',
      sellerPhoto: row.seller_photo || '',
      key: row.name.toLowerCase(),
      icon: row.name.toLowerCase().replace(/\s+/g, '-'),
      nameWords: row.name.toLowerCase().split(' '),
      alsoWords: [],
      categoryWords: [String(row.category).toLowerCase()],
    };
  };

    async function loadCatalogFromApi() {
      if (window.CaintaOneData.catalogSource === 'local') {
        itemCatalog = structuredClone(FALLBACK_CATALOG);
        return;
      }

      try {
      const rows = await api('/api/items?limit=500');
      const food = [];
      const bazaar = [];
      rows.forEach((row) => {
        const entry = apiItemToEntry(row);
        if (row.category === 'Food') food.push(entry);
        else bazaar.push(entry);
      });
      itemCatalog['Food Express'] = food;
      itemCatalog['Online Bazaar'] = bazaar;
      console.log('Catalog loaded from API:', food.length, 'food,', bazaar.length, 'bazaar');
    } catch (err) {
      console.warn('Catalog API failed, using fallback:', err.message);
      itemCatalog = structuredClone(FALLBACK_CATALOG);
    }
  }
  const catalogReady = loadCatalogFromApi();
  const foodPhotosByMenu = window.CaintaOneData.images.foodPhotosByMenu;

  let activeItemCategory = 'All';
  let itemSuggestionsDismissed = false;
  let itemMatches = [];
  let activeItemIndex = -1;
  let sellTriggerToRestoreFocus = null;

  const deliverySettings = window.CaintaOneData.deliverySettings;

  const formatDeliveryDuration = (seconds) => {
    const minutes = Math.max(1, Math.round(seconds / 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (!hours) return `${minutes} min`;
    return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
  };

  const drawDeliveryMap = (destination, pickup, routeGeometry = null, dispatch = null) => {
    const mapElement = document.getElementById('delivery-map');
    if (!mapElement || !window.L) {
      return false;
    }

    if (deliveryMap) deliveryMap.remove();
    const mapBounds = window.L.latLngBounds(caintaBounds);
    deliveryMap = window.L.map(mapElement, {
      maxBounds: mapBounds,
      maxBoundsViscosity: 1
    });
    deliveryMap.setMinZoom(deliveryMap.getBoundsZoom(mapBounds));
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(deliveryMap);

    const boundaryRings = caintaBoundary.map((ring) =>
      ring.map(([lon, lat]) => [lat, lon])
    );
    const surroundingMask = [
      [14.45, 120.95],
      [14.45, 121.3],
      [14.75, 121.3],
      [14.75, 120.95]
    ];
    window.L.polygon([surroundingMask, ...boundaryRings], {
      stroke: false,
      fillColor: '#0b1f3a',
      fillOpacity: 0.72,
      fillRule: 'evenodd',
      interactive: false
    }).addTo(deliveryMap);
    boundaryRings.forEach((ring) => {
      window.L.polygon(ring, {
        color: '#e58916',
        weight: 3,
        opacity: 1,
        fillColor: '#f7a93b',
        fillOpacity: 0.2,
        interactive: false
      }).addTo(deliveryMap);
    });

    const start = [pickup.lat, pickup.lon];
    const end = [destination.lat, destination.lon];
    const dispatchPoint = dispatch &&
      Number.isFinite(Number(dispatch.lat)) &&
      Number.isFinite(Number(dispatch.lon))
      ? [Number(dispatch.lat), Number(dispatch.lon)]
      : start;
    const pickupIcon = window.L.divIcon({
      className: 'delivery-map-icon-wrap',
      html: '<span class="delivery-map-pin delivery-map-pin--pickup"><span class="delivery-map-pin-dot"></span><span>Pickup</span></span>',
      iconSize: [88, 34],
      iconAnchor: [14, 30]
    });
    const dispatchIcon = window.L.divIcon({
      className: 'delivery-map-icon-wrap',
      html: '<span class="delivery-map-pin delivery-map-pin--dispatch"><span class="delivery-map-pin-dot"></span><span>Dispatch</span></span>',
      iconSize: [100, 34],
      iconAnchor: [14, 30]
    });
    const destinationIcon = window.L.divIcon({
      className: 'delivery-map-icon-wrap',
      html: '<span class="delivery-map-pin delivery-map-pin--destination"><span class="delivery-map-pin-dot"></span><span>Drop-off</span></span>',
      iconSize: [92, 34],
      iconAnchor: [14, 30]
    });
    const driverIcon = window.L.divIcon({
      className: 'delivery-map-icon-wrap',
      html: '<span class="delivery-map-driver" aria-label="Simulated rider">R</span>',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
    window.L.marker(start, { icon: pickupIcon }).addTo(deliveryMap)
      .bindPopup(`Pickup · ${pickup.label}`);
    if (dispatch) {
      window.L.marker(dispatchPoint, { icon: dispatchIcon }).addTo(deliveryMap)
        .bindPopup(`Dispatch base · ${dispatch.label}`);
    }
    window.L.marker(end, { icon: destinationIcon }).addTo(deliveryMap)
      .bindPopup(`Drop-off · ${destination.label}, Cainta`);
    const routePoints = routeGeometry
      ? routeGeometry.coordinates.map(([lon, lat]) => [lat, lon])
      : Array.from({ length: 31 }, (_, index) => [
        start[0] + ((end[0] - start[0]) * index) / 30,
        start[1] + ((end[1] - start[1]) * index) / 30
      ]);
    const approachRoutePoints = dispatch
      ? Array.from({ length: 21 }, (_, index) => [
        dispatchPoint[0] + ((start[0] - dispatchPoint[0]) * index) / 20,
        dispatchPoint[1] + ((start[1] - dispatchPoint[1]) * index) / 20
      ])
      : [start];
    if (dispatch) {
      window.L.polyline(approachRoutePoints, {
        color: '#e58916',
        weight: 4,
        opacity: 0.8,
        dashArray: '7 8'
      }).addTo(deliveryMap);
    }
    window.L.polyline(routePoints, { color: '#1f72d8', weight: 5, opacity: 0.85 }).addTo(deliveryMap);
    deliveryDriverMarker = window.L.marker(dispatchPoint, { icon: driverIcon })
      .addTo(deliveryMap)
      .bindPopup(`Simulated rider · ${dispatch?.riderName || 'Estimated route'} · not live GPS`);
    deliveryMap.fitBounds(window.L.latLngBounds([dispatchPoint, start, end]), { padding: [28, 28], maxZoom: 15 });
    window.setTimeout(() => deliveryMap?.invalidateSize(), 250);
    return { approachRoutePoints, deliveryRoutePoints: routePoints };
  };

  const startDeliverySimulation = (routes, roadRouteAvailable, plan) => {
    const approachRoutePoints = routes?.approachRoutePoints;
    const deliveryRoutePoints = routes?.deliveryRoutePoints;
    const driverName = plan.driverName || 'Simulated rider';
    const restaurantName = plan.restaurantName;
    const milestones = [
      { label: 'Order received', time: new Date(new Date(plan.foodReadyAt).getTime() - plan.foodPrepMinutes * 60_000) },
      { label: 'Food estimated ready', time: new Date(plan.foodReadyAt) },
      { label: 'Rider pickup', time: new Date(plan.pickupEta) },
      { label: 'Estimated delivery', time: new Date(plan.deliveryEta) }
    ];
    if (milestones.some((milestone) => !Number.isFinite(milestone.time.getTime()))) {
      if (deliveryEstimateStatus) deliveryEstimateStatus.textContent = 'The server returned invalid delivery estimates. Please refresh your orders or contact support.';
      return;
    }
    if (deliverySimulationTimer) window.clearInterval(deliverySimulationTimer);
    const stages = ['Order confirmed', 'Food ready', 'Rider pickup', 'Arrival ETA'];
    const milestoneList = document.getElementById('delivery-milestones');
    if (milestoneList) {
      milestoneList.replaceChildren();
      milestones.slice(1).forEach((milestone) => {
        const item = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = milestone.label;
        const time = document.createElement('time');
        time.dateTime = milestone.time.toISOString();
        time.textContent = milestone.time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        item.append(label, time);
        milestoneList.append(item);
      });
    }
    if (deliveryProgress) {
      deliveryProgress.replaceChildren();
      deliveryProgress.parentElement?.style.setProperty('--delivery-stage-count', String(stages.length));
      stages.forEach((stage, index) => {
        const step = document.createElement('li');
        const point = document.createElement('span');
        point.className = 'delivery-progress-point';
        point.setAttribute('aria-hidden', 'true');
        point.textContent = String(index + 1);
        const label = document.createElement('span');
        label.className = 'delivery-progress-label';
        label.textContent = stage;
        step.append(point, label);
        deliveryProgress.append(step);
      });
    }
    const departureAt = new Date(plan.driverDepartAt).getTime();
    const driverArrivalAt = new Date(plan.driverArrivalAt).getTime();
    const foodReadyAt = new Date(plan.foodReadyAt).getTime();
    const pickupAt = new Date(plan.pickupEta).getTime();
    const deliveryAt = new Date(plan.deliveryEta).getTime();
    const orderAt = milestones[0].time.getTime();
    if ([departureAt, driverArrivalAt, foodReadyAt, pickupAt, deliveryAt].some((time) => !Number.isFinite(time))) {
      if (deliveryEstimateStatus) deliveryEstimateStatus.textContent = 'The server returned incomplete rider forecast times. Please contact support.';
      return;
    }
    const progressSteps = deliveryProgress ? [...deliveryProgress.children] : [];
    const interpolateRoute = (points, progress) => {
      if (!points?.length) return null;
      const position = Math.min(1, Math.max(0, progress)) * (points.length - 1);
      const lower = Math.floor(position);
      const upper = Math.min(lower + 1, points.length - 1);
      const fraction = position - lower;
      return [
        points[lower][0] + (points[upper][0] - points[lower][0]) * fraction,
        points[lower][1] + (points[upper][1] - points[lower][1]) * fraction
      ];
    };
    let checkingCompletion = false;
    const update = async () => {
      const now = Date.now();
      const elapsed = Math.max(0, now - orderAt);
      const percent = latestDelivery?.delivered
        ? 1
        : Math.min(elapsed / Math.max(1, deliveryAt - orderAt), 0.99);
      const stageIndex = now >= deliveryAt ? 3 : now >= pickupAt ? 2 : now >= foodReadyAt ? 1 : 0;
      let point;
      if (now < departureAt) {
        point = approachRoutePoints?.[0];
      } else if (now < driverArrivalAt) {
        point = interpolateRoute(approachRoutePoints, (now - departureAt) / Math.max(1, driverArrivalAt - departureAt));
      } else if (now < pickupAt) {
        point = approachRoutePoints?.[approachRoutePoints.length - 1];
      } else {
        point = interpolateRoute(deliveryRoutePoints, (now - pickupAt) / Math.max(1, deliveryAt - pickupAt));
      }
      if (point) deliveryDriverMarker?.setLatLng(point);
      if (deliveryProgressBar) {
        deliveryProgressBar.setAttribute('aria-valuenow', String(Math.round(percent * 100)));
        deliveryProgressBar.setAttribute('aria-valuetext', stages[stageIndex]);
        const fill = deliveryProgressBar.querySelector('.delivery-progress-bar-fill');
        if (fill) fill.style.width = `${percent * 100}%`;
      }
      progressSteps.forEach((step, index) => {
        step.classList.toggle('is-complete', index < stageIndex || (percent === 1 && latestDelivery?.delivered));
        step.classList.toggle('is-current', index === stageIndex && (percent < 1 || !latestDelivery?.delivered));
      });
      if (deliveryEstimateTitle) {
        deliveryEstimateTitle.textContent = stageIndex === 3
          ? latestDelivery?.delivered ? 'Your delivery is complete' : 'Estimated delivery time reached'
          : stageIndex === 2
            ? 'Your order is on the way'
            : stageIndex === 1
              ? 'Food ready; rider pickup pending'
            : 'Your order is getting ready';
      }
      if (deliveryEstimateStatus) {
        deliveryEstimateStatus.textContent = latestDelivery?.delivered
          ? `Delivery confirmed by the server. ${driverName} is a simulated rider.`
          : now >= deliveryAt
            ? 'The estimated arrival time has passed; checking for server confirmation.'
          : now < departureAt
            ? `Fleet busy: ${driverName} is reserved for a later rider slot. Food is estimated ready at ${new Date(foodReadyAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`
            : now < driverArrivalAt
              ? `${driverName} is estimated to be traveling to ${restaurantName}.`
              : now < pickupAt
                ? now < foodReadyAt
                  ? `Food is being prepared at ${restaurantName}; ${driverName} is waiting for the estimated pickup time.`
                  : `Food is estimated ready; ${driverName} is waiting for the pickup time.`
                : `${driverName} is simulating the delivery route.${roadRouteAvailable ? '' : ' The route is approximate because road routing is unavailable.'}`;
      }
      if (now >= deliveryAt && latestDelivery?.shipmentId && !latestDelivery.delivered && !checkingCompletion) {
        checkingCompletion = true;
        try {
          const result = await api(`/api/shipments/${latestDelivery.shipmentId}`);
          if (result.shipment?.status === 'delivered') {
            latestDelivery.status = 'Delivery confirmed by the server.';
            latestDelivery.delivered = true;
            stages[3] = 'Delivered';
            const finalLabel = progressSteps[3]?.querySelector('.delivery-progress-label');
            if (finalLabel) finalLabel.textContent = stages[3];
            notifyChatDeliveryArrived();
            if (deliveryEstimateTitle) deliveryEstimateTitle.textContent = 'Your delivery is complete';
            if (deliveryEstimateStatus) deliveryEstimateStatus.textContent = `Delivery confirmed by the server. ${driverName} is a simulated rider.`;
            window.clearInterval(deliverySimulationTimer);
            deliverySimulationTimer = null;
          } else {
            latestDelivery.status = `Estimated arrival passed; server status is ${result.shipment?.status || 'not confirmed'}.`;
            if (deliveryEstimateStatus) deliveryEstimateStatus.textContent = latestDelivery.status;
          }
        } catch (error) {
          latestDelivery.status = `Estimated arrival passed; could not confirm status: ${error.message}`;
          if (deliveryEstimateStatus) deliveryEstimateStatus.textContent = latestDelivery.status;
        } finally {
          checkingCompletion = false;
        }
      } else if (latestDelivery) {
        latestDelivery.status = deliveryEstimateStatus?.textContent || stages[stageIndex];
      }
    };
    update();
    deliverySimulationTimer = window.setInterval(update, 5_000);
  };

  const deliveryBarangays = [
    'San Andres',
    'San Isidro',
    'San Juan',
    'San Roque',
    'Santa Rosa',
    'Santo Domingo',
    'Santo Niño'
  ];
  const deliveryAreaError = 'This location is outside our delivery area. Please enter an address in Cainta, Rizal, or choose a location inside the highlighted map boundary.';
  const normalizeBarangay = (value) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^barangay\s+/i, '')
    .trim()
    .toLocaleLowerCase();
  const getDeliveryBarangay = (properties, address) => {
    const possibleNames = [
      properties.suburb,
      properties.neighbourhood,
      properties.neighborhood,
      properties.city_district,
      properties.locality,
      properties.district,
      properties.name
    ].filter((value) => typeof value === 'string');
    for (const possibleName of possibleNames) {
      for (const part of possibleName.split(',')) {
        const barangay = deliveryBarangays.find(
          (name) => normalizeBarangay(name) === normalizeBarangay(part)
        );
        if (barangay) return barangay;
      }
    }
    const addressParts = address.split(/[,\n]/).map((part) => part.trim());
    for (const addressPart of addressParts) {
      const part = addressPart.replace(/^(?:brgy\.?|barangay)\s*/i, '');
      const barangay = deliveryBarangays.find(
        (name) => normalizeBarangay(name) === normalizeBarangay(part)
      );
      if (barangay) return barangay;
    }
    return null;
  };
  const getDeliveryStreetLine = (properties, address) => {
    const excludedParts = new Set([
      ...deliveryBarangays.map(normalizeBarangay),
      'cainta',
      'rizal',
      'philippines'
    ]);
    const addressParts = address.split(',').map((part) => part.trim()).filter(Boolean);
    const streetParts = addressParts.filter((part) => !excludedParts.has(normalizeBarangay(part)));
    if (streetParts.length) return streetParts.join(', ');
    const street = [properties.housenumber, properties.street || properties.name]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (street && !excludedParts.has(normalizeBarangay(street))) return street;
    return address.trim();
  };
  let selectedDeliverySuggestion = null;
  let deliveryPinMap = null;
  let deliveryPinMarker = null;
  let reverseGeocodeRequest = 0;
  const reverseGeocodeDeliveryLocation = async (lat, lon) => {
    const result = await api('/api/location/reverse', {
      method: 'POST',
      body: JSON.stringify({ lat, lon }),
      signal: AbortSignal.timeout(12000)
    });
    const properties = result.features?.[0]?.properties || {};
    const area = getDeliveryBarangay(
      properties,
      [properties.name, properties.suburb, properties.neighbourhood, properties.locality]
        .filter(Boolean)
        .join(', ')
    );
    const street = [properties.housenumber, properties.street || properties.name]
      .filter(Boolean)
      .join(' ')
      .trim();
    const locality = typeof properties.locality === 'string' ? properties.locality : '';
    const line1 = street || locality || `Pinned location (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
    const address = [line1, area || (locality !== line1 ? locality : ''), 'Cainta']
      .filter(Boolean)
      .join(', ');
    return {
      address,
      location: { lat, lon, label: address, area, line1 }
    };
  };
  const setDeliveryBarangayRequired = (required) => {
    if (!deliveryBarangayField || !deliveryBarangaySelect) return;
    deliveryBarangayField.hidden = !required;
    deliveryBarangaySelect.required = required;
    deliveryBarangaySelect.value = '';
  };
  const applyDeliveryBarangay = () => {
    if (!selectedDeliverySuggestion || !deliveryBarangaySelect?.value) return;
    const location = selectedDeliverySuggestion.location;
    location.area = deliveryBarangaySelect.value;
    const address = [location.line1 || 'Pinned location', location.area, 'Cainta']
      .filter(Boolean)
      .join(', ');
    location.label = address;
    selectedDeliverySuggestion.address = address;
    deliveryAddress.value = address;
    setDeliveryBarangayRequired(false);
    setDeliveryAddressFeedback(`Address set to ${address}. Checking delivery estimate...`, 'success');
    scheduleDeliveryPreview();
  };
  const applyPinnedDeliveryLocation = (suggestion, source) => {
    deliveryAddress.value = suggestion.address;
    selectedDeliverySuggestion = suggestion;
    hideDeliveryAddressSuggestions();
    const needsBarangay = !suggestion.location.area;
    setDeliveryBarangayRequired(needsBarangay);
    if (needsBarangay) {
      setDeliveryAddressFeedback(`${source}: the pin is inside Cainta. Choose your barangay to finish the address.`, 'info');
      deliveryBarangaySelect?.focus();
    } else {
      setDeliveryAddressFeedback(
        `${source}: ${suggestion.address}. The pin is inside Cainta; add a house or unit number if needed. Calculating estimate...`,
        'success'
      );
      scheduleDeliveryPreview();
    }
  };
  const useGpsLocation = async () => {
    if (!navigator.geolocation) {
      setDeliveryAddressFeedback('Location access is not supported by this browser.', 'error');
      return;
    }
    useGpsButton.disabled = true;
    useGpsButton.textContent = 'Locating...';
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      const { latitude: lat, longitude: lon, accuracy } = position.coords;
      if (!isInsideCainta(lon, lat)) {
        throw new Error(`GPS detected that you are outside Cainta. ${deliveryAreaError}`);
      }
      const suggestion = await reverseGeocodeDeliveryLocation(lat, lon);
      applyPinnedDeliveryLocation(suggestion, `Location found (about ${Math.round(accuracy)} m accuracy)`);
    } catch (error) {
      const message = error.code === 1
        ? 'Location permission was denied. Allow location access or enter your address manually.'
        : error.code === 2
          ? 'Your location could not be determined. Try again or enter your address manually.'
          : error.code === 3
            ? 'Finding your location timed out. Try again or enter your address manually.'
            : error.message || 'Could not find your location. Please enter your address manually.';
      setDeliveryAddressFeedback(message, 'error');
    } finally {
      useGpsButton.disabled = false;
      useGpsButton.textContent = 'Use my location';
    }
  };
  const closeDeliveryPinMap = () => {
    pinMapContainer.hidden = true;
    pinMapButton.textContent = 'Pin on map';
    pinMapButton.setAttribute('aria-expanded', 'false');
    deliveryPinMap?.remove();
    deliveryPinMap = null;
    deliveryPinMarker = null;
  };
  const toggleDeliveryPinMap = () => {
    if (!pinMapContainer || !pinMapButton) return;
    if (!pinMapContainer.hidden) {
      closeDeliveryPinMap();
      return;
    }
    if (!window.L) {
      setDeliveryAddressFeedback('The map is unavailable. Please enter your address manually.', 'error');
      return;
    }
    pinMapContainer.hidden = false;
    pinMapButton.textContent = 'Close map';
    pinMapButton.setAttribute('aria-expanded', 'true');
    const mapBounds = window.L.latLngBounds(caintaBounds);
    deliveryPinMap = window.L.map(pinMapContainer, {
      maxBounds: mapBounds,
      maxBoundsViscosity: 1
    }).setView([14.5800, 121.1100], 13);
    deliveryPinMap.setMinZoom(deliveryPinMap.getBoundsZoom(mapBounds));
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(deliveryPinMap);
    const boundaryRings = caintaBoundary.map((ring) =>
      ring.map(([lon, lat]) => [lat, lon])
    );
    const surroundingMask = [
      [14.45, 120.95],
      [14.45, 121.3],
      [14.75, 121.3],
      [14.75, 120.95]
    ];
    window.L.polygon([surroundingMask, ...boundaryRings], {
      stroke: false,
      fillColor: '#0b1f3a',
      fillOpacity: 0.72,
      fillRule: 'evenodd',
      interactive: false
    }).addTo(deliveryPinMap);
    boundaryRings.forEach((ring) => {
      window.L.polygon(ring, {
        color: '#e58916',
        weight: 3,
        fillColor: '#f7a93b',
        fillOpacity: 0.15,
        interactive: false
      }).addTo(deliveryPinMap);
    });
    deliveryPinMap.on('click', async (event) => {
      const { lat, lng: lon } = event.latlng;
      if (!isInsideCainta(lon, lat)) {
        setDeliveryAddressFeedback(deliveryAreaError, 'error');
        return;
      }
      deliveryPinMarker?.remove();
      deliveryPinMarker = window.L.marker([lat, lon]).addTo(deliveryPinMap);
      const requestId = ++reverseGeocodeRequest;
      setDeliveryAddressFeedback('Looking up the pinned location...', 'pending');
      try {
        const suggestion = await reverseGeocodeDeliveryLocation(lat, lon);
        if (requestId !== reverseGeocodeRequest) return;
        applyPinnedDeliveryLocation(suggestion, 'Location pinned');
      } catch (error) {
        if (requestId !== reverseGeocodeRequest) return;
        setDeliveryAddressFeedback(error.message || 'Could not look up that point. Please enter your address manually.', 'error');
      }
    });
    window.setTimeout(() => deliveryPinMap?.invalidateSize(), 100);
  };
  useGpsButton?.addEventListener('click', useGpsLocation);
  pinMapButton?.addEventListener('click', toggleDeliveryPinMap);
  deliveryBarangaySelect?.addEventListener('change', applyDeliveryBarangay);
  const hideDeliveryAddressSuggestions = () => {
    if (!deliveryAddressSuggestions) return;
    deliveryAddressSuggestions.replaceChildren();
    deliveryAddressSuggestions.hidden = true;
  };
  const formatDeliverySuggestion = (properties, area, address) => {
    const street = getDeliveryStreetLine(properties, address);
    return [street, area || properties.locality || properties.district, properties.city?.toLowerCase().includes('cainta') ? properties.city : 'Cainta']
      .filter((part, index, parts) => part && parts.indexOf(part) === index)
      .join(', ');
  };
  const geocodeDeliveryAddress = async (address) => {
    const normalizedAddress = address.trim();
    if (!normalizedAddress) throw new Error('Enter your full delivery address to look up the delivery location.');
    if (selectedDeliverySuggestion?.address === normalizedAddress) {
      if (!selectedDeliverySuggestion.location.area) {
        setDeliveryBarangayRequired(true);
        throw new Error('Choose your barangay to complete the delivery address.');
      }
      return selectedDeliverySuggestion.location;
    }
    const result = await api('/api/location/lookup', {
      method: 'POST',
      body: JSON.stringify({ address: normalizedAddress }),
      signal: AbortSignal.timeout(12000)
    });
    const matches = (result.features || []).filter((feature) => {
      const [lon, lat] = feature.geometry?.coordinates || [];
      const properties = feature.properties || {};
      const caintaName = [properties.city, properties.county, properties.district, properties.locality]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return Number.isFinite(lon) &&
        Number.isFinite(lat) &&
        properties.countrycode?.toUpperCase() === 'PH' &&
        caintaName.includes('cainta') &&
        isInsideCainta(lon, lat);
    });
    if (!matches.length) {
      if (deliveryAddress?.value.trim() === normalizedAddress) {
        hideDeliveryAddressSuggestions();
      }
      throw new Error(`We could not match that address to Cainta. ${deliveryAreaError}`);
    }
    const suggestions = matches.map((feature) => {
      const properties = feature.properties || {};
      const area = getDeliveryBarangay(properties, normalizedAddress);
      const line1 = getDeliveryStreetLine(properties, normalizedAddress);
      const label = formatDeliverySuggestion(properties, area, normalizedAddress);
      return {
        address: label || normalizedAddress,
        location: {
          lat: feature.geometry.coordinates[1],
          lon: feature.geometry.coordinates[0],
          label: label || 'Cainta',
          area,
          line1
        }
      };
    });
    if (deliveryAddressSuggestions && suggestions.length && deliveryAddress?.value.trim() === normalizedAddress) {
      hideDeliveryAddressSuggestions();
      suggestions.forEach((suggestion) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'delivery-address-suggestion';
        button.textContent = suggestion.address;
        button.addEventListener('click', () => {
          deliveryAddress.value = suggestion.address;
          selectedDeliverySuggestion = suggestion;
          hideDeliveryAddressSuggestions();
          setDeliveryBarangayRequired(!suggestion.location.area);
          if (!suggestion.location.area) {
            setDeliveryAddressFeedback('Choose your barangay to complete the delivery address.', 'info');
            deliveryBarangaySelect?.focus();
            return;
          }
          scheduleDeliveryPreview();
        });
        deliveryAddressSuggestions.append(button);
      });
      deliveryAddressSuggestions.hidden = false;
    }
    const destination = selectedDeliverySuggestion?.address === normalizedAddress
      ? selectedDeliverySuggestion.location
      : suggestions[0].location;
    if (!destination.area) {
      throw new Error('Choose a matching address suggestion, then select your barangay to continue.');
    }
    return destination;
  };

  let deliveryPreviewTimer = null;
  let deliveryPreviewRequest = 0;
  let cachedDeliveryPreview = null;
  const deliveryPreviewKey = () => [
    selectedRestaurant?.name || '',
    deliveryAddress?.value.trim() || ''
  ].join('|');

  const calculateDeliveryEstimate = async (address) => {
    const restaurantArea = selectedRestaurant && caintaAreas[selectedRestaurant.area];
    if (!restaurantArea) {
      throw new Error('Choose a restaurant in Cainta first.');
    }
    const destination = await geocodeDeliveryAddress(address);
    const hasRestaurantCoordinates =
      Number.isFinite(selectedRestaurant.lat) && Number.isFinite(selectedRestaurant.lon);
    const pickup = hasRestaurantCoordinates
      ? {
          lat: selectedRestaurant.lat,
          lon: selectedRestaurant.lon,
          label: selectedRestaurant.address
        }
      : { ...restaurantArea, label: `${selectedRestaurant.name} · approximate ${restaurantArea.label}, Cainta` };
    let route = null;
    let routeError = '';
    try {
      const routeUrl = `https://router.project-osrm.org/route/v1/driving/${pickup.lon},${pickup.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson`;
      const response = await fetch(routeUrl);
      if (!response.ok) throw new Error('Road routing service is unavailable.');
      const result = await response.json();
      const candidate = result.routes?.[0];
      if (
        result.code !== 'Ok' ||
        !candidate ||
        !Array.isArray(candidate.geometry?.coordinates) ||
        !Number.isFinite(candidate.duration) ||
        !Number.isFinite(candidate.distance)
      ) throw new Error('No road route was found between these locations.');
      route = candidate;
    } catch (error) {
      routeError = error instanceof Error ? error.message : String(error);
    }
    const directDistanceKm = Math.hypot(
      (destination.lat - pickup.lat) * 111,
      (destination.lon - pickup.lon) * 107
    );
    const averageSpeedKmh = deliverySettings.assumedAverageSpeedKmh;
    if (!Number.isFinite(averageSpeedKmh) || averageSpeedKmh <= 0) {
      throw new Error('Set a valid average delivery speed in data/delivery-settings.js.');
    }
    const distanceKm = route ? route.distance / 1000 : directDistanceKm;
    const estimatedSeconds = Math.max(60, (distanceKm / averageSpeedKmh) * 3600);
    const summary = route
      ? `About ${formatDeliveryDuration(estimatedSeconds)} at an assumed ${averageSpeedKmh} km/h · ${(route.distance / 1000).toFixed(1)} km by road`
      : `About ${formatDeliveryDuration(estimatedSeconds)} at an assumed ${averageSpeedKmh} km/h · ${directDistanceKm.toFixed(1)} km straight-line distance (approximate; road route unavailable)${routeError ? ` · ${routeError}` : ''}`;
    return {
      destination,
      pickup,
      route,
      routeError,
      directDistanceKm,
      estimatedSeconds,
      summary,
      hasRestaurantCoordinates,
      key: deliveryPreviewKey()
    };
  };

  const scheduleDeliveryPreview = () => {
    if (deliveryPreviewTimer) window.clearTimeout(deliveryPreviewTimer);
    const requestId = ++deliveryPreviewRequest;
    cachedDeliveryPreview = null;
    if (latestDelivery?.preview) latestDelivery = null;
    if (sellServiceField?.value === 'Online Bazaar' && bazaarCheckoutStarted && deliveryEstimate) {
      deliveryEstimate.hidden = true;
    }
    if (!deliveryAddressPreview) return;
    const address = deliveryAddress?.value.trim() || '';
    if (!address || address.length < 3) {
      hideDeliveryAddressSuggestions();
      setDeliveryAddressFeedback('Enter your address to preview the estimated travel time.', 'info');
      return;
    }
    if (!selectedRestaurant) {
      setDeliveryAddressFeedback('Choose a restaurant to preview the delivery time.', 'info');
      return;
    }
    setDeliveryAddressFeedback('Checking that this address is in Cainta…', 'pending');
    deliveryPreviewTimer = window.setTimeout(async () => {
      try {
        const preview = await calculateDeliveryEstimate(address);
        if (requestId !== deliveryPreviewRequest || preview.key !== deliveryPreviewKey()) return;
        cachedDeliveryPreview = preview;
        latestDelivery = {
          status: 'Address estimate preview',
          summary: preview.summary,
          delivered: false,
          preview: true,
          estimatedSeconds: preview.estimatedSeconds,
          etaAt: new Date(Date.now() + preview.estimatedSeconds * 1000),
          assumedAverageSpeedKmh: deliverySettings.assumedAverageSpeedKmh
        };
        setDeliveryAddressFeedback(`Estimated travel time: ${formatDeliveryDuration(preview.estimatedSeconds)} · ${preview.summary}. This is an estimate, not a live ETA.`, 'success');
        if (sellServiceField?.value === 'Online Bazaar' && bazaarCheckoutStarted) {
          if (deliveryEstimate) deliveryEstimate.hidden = false;
          if (deliveryEstimateTitle) deliveryEstimateTitle.textContent = 'Delivery route preview';
          if (deliveryEstimateSummary) {
            deliveryEstimateSummary.textContent = `To ${preview.destination.label}, Cainta · ${preview.summary}`;
          }
          if (deliveryEstimateStatus) {
            deliveryEstimateStatus.textContent = 'Review the map and address, then place your COD order to confirm delivery.';
          }
          drawDeliveryMap(preview.destination, preview.pickup, preview.route?.geometry);
        }
      } catch (error) {
        if (requestId !== deliveryPreviewRequest) return;
        setDeliveryAddressFeedback(error.message, 'error');
      }
    }, 700);
  };

  const estimateDeliveryRoute = async () => {
    if (!deliveryAddress || !deliveryEstimate || !deliveryEstimateStatus || !deliveryEstimateSummary) return;
    const addressText = deliveryAddress.value.trim();
    if (!selectedDeliverySuggestion || selectedDeliverySuggestion.address !== addressText) {
      const error = 'Choose a matching address from the map suggestions before placing your order.';
      setDeliveryAddressFeedback(error, 'error');
      throw new Error(error);
    }
    deliveryEstimate.hidden = false;
    deliveryEstimate.scrollIntoView({ behavior: 'smooth', block: 'start' });
    deliveryEstimateSummary.textContent = '';
    deliveryEstimateStatus.textContent = 'Preparing your Cainta delivery map...';
    if (deliveryMapLink) deliveryMapLink.hidden = true;
    if (deliveryPreviewTimer) window.clearTimeout(deliveryPreviewTimer);
    deliveryPreviewRequest += 1;
    const preview = cachedDeliveryPreview?.key === deliveryPreviewKey()
      ? cachedDeliveryPreview
      : await calculateDeliveryEstimate(addressText);
    const {
      destination,
      pickup,
      route,
      routeError,
      directDistanceKm,
      estimatedSeconds,
      summary: routeSummary,
      hasRestaurantCoordinates
    } = preview;
    const start = [pickup.lat, pickup.lon];
    const end = [destination.lat, destination.lon];
    const osmRoute = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${pickup.lat},${pickup.lon};${destination.lat},${destination.lon}`;
    if (deliveryMapLink) {
      deliveryMapLink.href = osmRoute;
      deliveryMapLink.hidden = false;
    }

    const session = readLocalRecord(sessionStorageKey);
    if (!session?.token) {
      throw new Error('Your sign-in has expired. Sign in again before placing your order.');
    }
    const address = await api('/api/addresses', {
      method: 'POST',
      body: JSON.stringify({
        line1: destination.line1 || addressText,
        area: destination.area,
        lat: destination.lat,
        lon: destination.lon
      })
    });
    if (!address?.id) {
      throw new Error('The delivery address was saved without an ID. The shipment could not be created.');
    }
    const originWh = 'bbbb0001-0000-0000-0000-000000000001'; // WH-JCT-01
    const items = foodCartContents.length
      ? foodCartContents.map((line) => ({
          product_id: sellIsFoodOrder
            ? 'dddd0001-0000-0000-0000-000000000001'
            : line.entry.listingId,
          quantity: line.quantity
        }))
      : [{ product_id: 'dddd0001-0000-0000-0000-000000000001', quantity: 1 }];
    const created = await api('/api/shipments', {
      method: 'POST',
      body: JSON.stringify({
        origin_warehouse: originWh,
        destination_addr: address.id,
        vehicle_type: 'motorcycle',
        vehicle_plate: 'DEMO-001',
        payment_method: 'cod',
        amount_paid: 0,
        delivery_kind: sellIsFoodOrder ? 'food' : 'bazaar',
        ...(sellIsFoodOrder ? {
          restaurant: {
            name: selectedRestaurant.name,
            lat: Number(selectedRestaurant.lat),
            lon: Number(selectedRestaurant.lon)
          }
        } : {}),
        items
      })
    });
    const deliveryPlan = created.delivery_plan;
    if (sellIsFoodOrder && !deliveryPlan) {
      throw new Error(`Order ${created.tracking_number} was created, but the server did not return its rider schedule. Check My Orders before placing it again.`);
    }
    const dispatch = sellIsFoodOrder
      ? {
          lat: deliveryPlan.driverOrigin.lat,
          lon: deliveryPlan.driverOrigin.lon,
          label: `Simulated rider start · ${deliveryPlan.driverName}`,
          riderName: deliveryPlan.driverName
        }
      : {
          ...caintaAreas.Junction,
          label: 'Approximate Cainta dispatch point'
        };
    const routePoints = drawDeliveryMap(destination, pickup, route?.geometry, dispatch);
    if (deliveryEstimateTitle) deliveryEstimateTitle.textContent = 'Your delivery is on the way';
    latestDelivery = {
      shipmentId: created.id,
      trackingNumber: created.tracking_number,
      summary: routeSummary,
      status: 'Order confirmed',
      delivered: false,
      estimatedSeconds: deliveryPlan?.estimatedDeliveryMinutes
        ? deliveryPlan.estimatedDeliveryMinutes * 60
        : estimatedSeconds,
      etaAt: deliveryPlan ? new Date(deliveryPlan.deliveryEta) : new Date(Date.now() + estimatedSeconds * 1000),
      assumedAverageSpeedKmh: deliverySettings.assumedAverageSpeedKmh
    };
    
    const foodOrderSummary = foodCartContents
      .map((line) => `${line.quantity} × ${line.entry.name}`)
      .join(', ');
    const foodOrderTotal = foodCartContents.reduce((amount, line) => amount + line.entry.price * line.quantity, 0);
    deliveryEstimateSummary.textContent = sellIsFoodOrder
      ? `${foodOrderSummary} from ${selectedRestaurant.name} · PHP ${foodOrderTotal.toFixed(2)} · ${addressText} · Rider ${deliveryPlan.driverName} · ${deliveryPlan.estimatedDeliveryMinutes} min estimated`
      : `${addressText} · ${routeSummary}`;
    if (sellIsFoodOrder) {
      startDeliverySimulation(
        routePoints,
        Boolean(route),
        deliveryPlan
      );
    } else {
      const pickupText = hasRestaurantCoordinates
        ? `Route starts at the mapped ${selectedRestaurant.name} pickup location`
        : `Route starts at an approximate ${selectedRestaurant.name} area location`;
      deliveryEstimateStatus.textContent = route
        ? `${pickupText} and ends at the matched delivery address.`
        : `${routeError || 'Road route unavailable.'} ${pickupText}; the fallback route is approximate.`;
    }
    if (!route && routeError && !window.L && deliveryEstimateStatus) {
      deliveryEstimateStatus.textContent = `${routeError} The map library is also unavailable, but the delivery timeline will still run.`;
    } else if (!window.L && deliveryEstimateStatus) {
      deliveryEstimateStatus.textContent = 'The map library is unavailable; the delivery timeline will still run.';
    }
  };

  deliveryAddress?.addEventListener('input', () => {
    if (selectedDeliverySuggestion?.address !== deliveryAddress.value.trim()) {
      selectedDeliverySuggestion = null;
      setDeliveryBarangayRequired(false);
    }
    scheduleDeliveryPreview();
  });

  const images = window.CaintaOneData.images;
  const categoryImages = images.categoryImages;
  const productPhoto = (photo, alt) => ({
    src: catalogImagePath(photo),
    type: 'icon',
    alt
  });
  const itemImages = Object.fromEntries(Object.entries(images.itemImages).map(([name, image]) => [
    name,
    typeof image === 'string' ? productPhoto(image, `Representative photo for ${name}`) : image
  ]));
  const categoryIcons = images.categoryIcons;

  const makeIcon = (name) => {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const use = document.createElementNS(svgNS, 'use');
    use.setAttribute('href', `#ic-${document.getElementById(`ic-${name}`) ? name : 'default'}`);
    svg.append(use);
    return svg;
  };

  const addConfiguredImage = (container, imageConfig, fallbackIcon, bannerClass) => {
    if (!imageConfig?.src) {
      container.append(makeIcon(fallbackIcon));
      return false;
    }

    const image = document.createElement('img');
    image.src = imageConfig.src;
    image.alt = imageConfig.alt || '';
    image.className = imageConfig.type === 'banner' ? bannerClass : 'item-picture-icon';
    image.addEventListener('error', () => image.replaceWith(makeIcon(fallbackIcon)), { once: true });
    container.append(image);
    return imageConfig.type === 'banner';
  };

  // Edit distance that counts two swapped neighbouring letters as one typo ("shrit" -> "shirt").
  const typoDistance = (a, b) => {
    const rows = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j += 1) rows[0][j] = j;
    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
        }
      }
    }
    return rows[a.length][b.length];
  };

  const isCloseSpelling = (token, words) => {
    const allowed = token.length >= 7 ? 2 : token.length >= 4 ? 1 : 0;
    if (!allowed) return false;
    return words.some((word) => word.length >= 3 && (
      typoDistance(token, word) <= allowed ||
      typoDistance(token, word.slice(0, token.length)) <= allowed
    ));
  };

  // Higher score = better guess. Every word you typed has to match something.
  const scoreItem = (entry, tokens, allowTypos) => {
    let total = 0;
    for (const token of tokens) {
      let best = 0;
      if (entry.nameWords.some((word) => word.startsWith(token))) best = 4;
      else if (entry.nameWords.some((word) => word.includes(token))) best = 2.5;
      else if (entry.alsoWords.some((word) => word.startsWith(token))) best = 2;
      else if (entry.alsoWords.some((word) => word.includes(token))) best = 1.2;
      else if (entry.categoryWords.some((word) => word.startsWith(token))) best = 1;
      else if (allowTypos && (isCloseSpelling(token, entry.nameWords) || isCloseSpelling(token, entry.alsoWords))) best = 0.8;
      if (!best) return 0;
      total += best;
    }
    return total + (entry.key.startsWith(tokens.join(' ')) ? 3 : 0);
  };

  const findItemMatches = (serviceName, query, category) => {
    const pool = (itemCatalog[serviceName] || [])
      .filter((entry) => category === 'All' || entry.category === category);
    const tokens = normalizeItemText(query).split(' ').filter(Boolean);

    if (!tokens.length) {
      const list = category === 'All' && serviceName !== 'Online Bazaar'
        ? pool.filter((entry) => entry.popular)
        : pool;
      const limit = serviceName === 'Online Bazaar' ? 12 : 8;
      return { label: serviceName === 'Online Bazaar' ? 'Product listings' : category === 'All' ? 'Popular menu picks' : `${category} menu`, entries: list.slice(0, limit), tokens };
    }

    for (const allowTypos of [false, true]) {
      const hits = pool
        .map((entry) => ({ entry, score: scoreItem(entry, tokens, allowTypos) }))
        .filter((hit) => hit.score > 0)
        .sort((a, b) =>
          b.score - a.score ||
          Number(b.entry.popular) - Number(a.entry.popular) ||
          a.entry.name.localeCompare(b.entry.name))
        .slice(0, serviceName === 'Online Bazaar' ? 12 : 6);
      if (hits.length) {
        return {
          label: allowTypos ? 'Did you mean' : serviceName === 'Online Bazaar' ? 'Product listings' : 'Suggestions',
          entries: hits.map((hit) => hit.entry),
          tokens: allowTypos ? [] : tokens
        };
      }
    }
    return { label: '', entries: [], tokens };
  };

  const chatPanel = document.getElementById('assistant-chat-panel');
  const chatToggle = document.getElementById('assistant-chat-toggle');
  const mobileChatToggle = document.querySelector('[data-mobile-chat]');
  const chatClose = document.getElementById('assistant-chat-close');
  const chatForm = document.getElementById('assistant-chat-form');
  const chatInput = document.getElementById('assistant-chat-input');
  const chatMessages = document.getElementById('assistant-chat-messages');
  const chatUnread = document.getElementById('assistant-chat-unread');
  const chatNotifications = document.getElementById('assistant-chat-notifications');
  const deliveryArrivalPopout = document.getElementById('delivery-arrival-popout');
  const deliveryArrivalMessage = document.getElementById('delivery-arrival-message');
  const deliveryArrivalClose = document.getElementById('delivery-arrival-close');
  let chatNotificationsEnabled = false;
  let deliveryArrivalTimer = null;



  
    const addChatMessage = (message, sender = 'assistant') => {
    if (!chatMessages) return;
    const wrapper = document.createElement('div');
    wrapper.className = `assistant-chat-row ${sender === 'user' ? 'is-user' : 'is-assistant'}`;

    if (sender === 'assistant') {
      const avatar = document.createElement('span');
      avatar.className = 'assistant-chat-bubble-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      const avatarImage = document.createElement('img');
      avatarImage.src = 'rotom.png';
      avatarImage.width = 26;
      avatarImage.height = 26;
      avatarImage.alt = '';
      avatarImage.style.borderRadius = '50%';
      avatar.append(avatarImage);
      wrapper.append(avatar);
    }

    const bubble = document.createElement('p');
    bubble.className = `assistant-chat-message ${sender === 'user' ? 'is-user' : 'is-assistant'}`;
    bubble.textContent = message;
    wrapper.append(bubble);

    chatMessages.append(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    if (sender === 'assistant' && chatPanel?.hidden && chatUnread) {
      chatUnread.hidden = false;
    }
    return bubble;
  };

  const showDeliveryArrivalPopout = (message) => {
    if (!deliveryArrivalPopout || !deliveryArrivalMessage) return;
    deliveryArrivalMessage.textContent = message;
    deliveryArrivalPopout.hidden = false;
    if (deliveryArrivalTimer) window.clearTimeout(deliveryArrivalTimer);
    deliveryArrivalTimer = window.setTimeout(() => {
      deliveryArrivalPopout.hidden = true;
      deliveryArrivalTimer = null;
    }, 10000);
  };
  deliveryArrivalClose?.addEventListener('click', () => {
    deliveryArrivalPopout.hidden = true;
    if (deliveryArrivalTimer) window.clearTimeout(deliveryArrivalTimer);
    deliveryArrivalTimer = null;
  });

  const notifyChatDeliveryArrived = () => {
    const message = rotomify('Your order has been marked delivered by the server. Enjoy your order. Bzzt!');
    addChatMessage(message);
    showDeliveryArrivalPopout(message);
    if (chatNotificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Your order has arrived', { body: message });
      } catch (error) {
        console.error('Could not show the browser delivery notification.', error);
      }
    }
  };

    const rotomify = (text) => {
    if (!text) return text;
    const openers = ['Bzzt! ', 'Zzzt — ', 'Rotom here! ', '', 'Bzzt bzzt! '];
    const open = openers[Math.floor(Math.random() * openers.length)];

    const swaps = [
      [/\bHere is\b/i, 'Rotom has the data!'],
      [/\bI couldn't find\b/i, 'Rotom zzzt — could not find'],
      [/\bI can answer\b/i, 'Rotom can answer'],
      [/\bI will still show\b/i, 'Rotom will still display']
    ];
    let body = text;
    for (const [from, to] of swaps) body = body.replace(from, to);

    const tail = Math.random() < 0.5 ? ' Zzt.' : '';
    return `${open}${body}${tail}`;
  };

  const answerChatQuestion = (question) => {
    const normalized = normalizeItemText(question);
    if (/^(hi|hello|hey|help|start)$/.test(normalized)) {
      return 'Ask me “how long is my delivery?”, “cheapest burger”, or “best deals on shirts”. I can compare current listings and report simulated order status.';
    }
    if (/\b(delivery|deliver|arrive|arrival|order|package|tracking|eta)\b/.test(normalized)) {
      if (latestDelivery) {
        return latestDelivery.delivered
          ? `Your latest order is delivered. ${latestDelivery.summary}.`
          : `Your latest delivery status: ${latestDelivery.status} ${latestDelivery.summary}. The road time is an estimate for the route only, not a live courier ETA.`;
      }
      return 'There is no active delivery to track. For a route estimate, place a Food Express order after choosing a restaurant and Cainta delivery area. The map uses approximate locations; Bazaar requests do not have live parcel tracking yet.';
    }
    if (/\b(deal|deals|cheap|cheapest|price|prices|compare|lowest|best)\b/.test(normalized)) {
      const mentionsFood = /\b(food|meal|dish|menu|restaurant|burger|chicken|pizza|fries|noodles|spaghetti|siomai|chowking|jollibee|kfc|popeyes|greenwich|inasal|chao fan|big mac|yumburger)\b/.test(normalized);
      const mentionsBazaar = /\b(bazaar|product|products|clothes|clothing|shirt|shirts|shoes|sneakers|bags|electronics|accessories|home)\b/.test(normalized);
      const service = mentionsFood && !mentionsBazaar ? 'Food Express' : 'Online Bazaar';
      const ignoredWords = new Set([
        'best', 'deal', 'deals', 'cheap', 'cheapest', 'price', 'prices', 'compare', 'lowest',
        'find', 'show', 'me', 'the', 'for', 'on', 'in', 'at', 'of', 'a', 'an', 'and',
        'food', 'meal', 'dish', 'menu', 'restaurant', 'bazaar', 'product', 'products',
        'market', 'clothes', 'clothing', 'please', 'what', 'is', 'are', 'some'
      ]);
      const terms = normalized.split(' ').filter((word) => word && !ignoredWords.has(word));
      const catalog = itemCatalog[service] || [];
      const candidates = terms.length
        ? findItemMatches(service, terms.join(' '), 'All').entries
        : catalog;
      const affordable = candidates
        .filter((entry) => Number.isFinite(Number(entry.price)) && Number(entry.price) > 0)
        .sort((a, b) => Number(a.price) - Number(b.price))
        .slice(0, 3);
      if (!affordable.length) {
        return `I couldn't find a matching ${service === 'Food Express' ? 'menu item' : 'product'} in the current catalog. Try a broader search term.`;
      }
      const offers = affordable.map((entry) =>
        `${entry.name} — PHP ${Number(entry.price).toFixed(2)}${service === 'Food Express' ? ` at ${entry.category}` : ` from ${entry.seller || 'a local seller'}`}`
      );
      return `Lowest listed ${service === 'Food Express' ? 'menu prices' : 'product prices'} in the current catalog: ${offers.join('; ')}. These are price comparisons, not verified sale discounts.`;
    }

    const mentionsFood = /\b(food|meal|dish|menu|restaurant|jollibee|mcdonalds|kfc|chowking|inasal|greenwich|popeyes|burger king|burger|chicken|pizza|fries|spaghetti|siomai|big mac|yumburger)\b/.test(normalized);
    const mentionsBazaar = /\b(bazaar|product|clothes|clothing|shirt|shirts|shoes|sneakers|bags|electronics|accessories|home)\b/.test(normalized);
    const service = mentionsFood && !mentionsBazaar ? 'Food Express' : 'Online Bazaar';
    const terms = normalized.split(' ').filter((word) => ![
      'do', 'you', 'have', 'what', 'is', 'the', 'tell', 'me', 'about', 'show', 'find', 'a', 'an', 'please'
    ].includes(word));
    const matches = findItemMatches(service, terms.join(' '), 'All').entries.slice(0, 3);
    if (matches.length) {
      return matches.map((entry) =>
        `${entry.name}: PHP ${Number(entry.price).toFixed(2)}${service === 'Food Express' ? ` at ${entry.category}` : ` from ${entry.seller || 'a local seller'}`}.`
      ).join(' ');
    }
    return 'I can answer from the current catalog only. Ask about a product or meal, compare prices, or check your delivery status.';
  };

  chatToggle?.addEventListener('click', () => {
    const opening = Boolean(chatPanel?.hidden);
    if (chatPanel) chatPanel.hidden = !opening;
    chatToggle.setAttribute('aria-expanded', String(opening));
    mobileChatToggle?.setAttribute('aria-expanded', String(opening));
    if (opening) {
      if (chatUnread) chatUnread.hidden = true;
      chatInput?.focus();
    }
  });
  mobileChatToggle?.addEventListener('click', () => chatToggle?.click());
  chatClose?.addEventListener('click', () => {
    if (chatPanel) chatPanel.hidden = true;
    chatToggle?.setAttribute('aria-expanded', 'false');
    mobileChatToggle?.setAttribute('aria-expanded', 'false');
    const focusTarget = window.matchMedia('(max-width: 640px)').matches ? mobileChatToggle : chatToggle;
    focusTarget?.focus();
  });
  // ------------------------------------------------------------------
  // AI chat: sends the question + a small slice of the site's own data
  // (catalog, delivery status) to /api/chat. Falls back to the old
  // rule-based answers if the server or AI is unavailable.
  // ------------------------------------------------------------------
  const chatHistory = []; // [{ role: 'user' | 'assistant', content }]

  const buildChatContext = (question) => {
    const normalized = normalizeItemText(question);
    const seen = new Set();
    const items = [];
    const add = (service, entry) => {
      const key = `${service}|${entry.category}|${entry.name}`;
      if (seen.has(key) || items.length >= 45) return;
      seen.add(key);
      items.push({
        service,
        name: entry.name,
        price: Number(entry.price) || null,
        place: service === 'Food Express' ? entry.category : (entry.seller || null)
      });
    };
    ['Food Express', 'Online Bazaar'].forEach((service) => {
      const catalog = itemCatalog[service] || [];
      findItemMatches(service, normalized, 'All').entries.slice(0, 15).forEach((e) => add(service, e));
      [...catalog].filter((e) => Number(e.price) > 0)
        .sort((a, b) => Number(a.price) - Number(b.price)).slice(0, 6).forEach((e) => add(service, e));
      catalog.filter((e) => e.popular).slice(0, 4).forEach((e) => add(service, e));
    });
    return {
      company: companyDetails,
      restaurants: [...new Set((itemCatalog['Food Express'] || []).map((e) => e.category))].slice(0, 40),
      items,
      latestDelivery: latestDelivery
        ? {
          status: latestDelivery.status,
          summary: latestDelivery.summary,
          estimatedTripMinutes: Math.max(1, Math.round(latestDelivery.estimatedSeconds / 60)),
          assumedAverageSpeedKmh: latestDelivery.assumedAverageSpeedKmh,
          delivered: Boolean(latestDelivery.delivered)
        }
        : null
    };
  };

  const answerDeliveryTimingQuestion = () => {
    if (latestDelivery?.delivered) {
      return `Your latest order has already been delivered. Its estimated road trip was about ${formatDeliveryDuration(latestDelivery.estimatedSeconds)}.`;
    }
    if (latestDelivery?.estimatedSeconds) {
      return `Your current route estimate is about ${formatDeliveryDuration(latestDelivery.estimatedSeconds)} at an assumed average speed of ${latestDelivery.assumedAverageSpeedKmh} km/h. It is approximate road travel only, not food preparation time or a live courier ETA.`;
    }
    return 'There is no active route estimate yet. To get one, choose a Food Express restaurant and delivery area, then continue through checkout; the app estimates road travel time using the route and the configured assumed average speed. It is approximate and does not include food preparation time.';
  };

  const askAssistantAI = async (question) => {
    const data = await api('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [...chatHistory.slice(-10), { role: 'user', content: question }],
        context: buildChatContext(question)
      })
    });
    if (!data?.reply) throw new Error('Empty reply');
    return data.reply;
  };

  chatForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const question = chatInput?.value.trim();
    if (!question) return;
    addChatMessage(question, 'user');
    chatForm.reset();
    const bubble = addChatMessage('Rotom is thinking… zzzt');
    let reply;
    const normalizedQuestion = normalizeItemText(question);
    const asksDeliveryTiming = /\b(how long|how many (minutes|mins|hours)|eta|gaano katagal|ilang (minuto|oras)|mga ilang minuto)\b/.test(normalizedQuestion);
    if (asksDeliveryTiming) {
      reply = rotomify(answerDeliveryTimingQuestion());
    } else {
      try {
        reply = await askAssistantAI(question);
      } catch (error) {
        console.warn('AI chat unavailable, using built-in answers.', error);
        reply = rotomify(answerChatQuestion(question));
      }
    }
    if (bubble) bubble.textContent = reply;
    chatHistory.push({ role: 'user', content: question }, { role: 'assistant', content: reply });
    chatMessages.scrollTop = chatMessages.scrollHeight;
    chatInput?.focus();
  });
  chatNotifications?.addEventListener('click', async () => {
    if (!('Notification' in window)) {
      addChatMessage('This browser does not support desktop notifications. I will still show arrival updates here while the page is open.');
      return;
    }
    try {
      const permission = Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;
      chatNotificationsEnabled = permission === 'granted';
      chatNotifications.textContent = chatNotificationsEnabled ? 'Arrival notifications enabled' : 'Browser notifications blocked';
      if (!chatNotificationsEnabled) {
        addChatMessage(rotomify('Browser notifications were not enabled. Arrival updates will still appear in this chat while the page is open.'));
      } else {
      addChatMessage(rotomify('Browser arrival notifications are enabled for this page.'));
      }
    } catch (error) {
      console.error('Could not enable browser delivery notifications.', error);
      addChatMessage(rotomify('Could not enable browser notifications. Arrival updates will still appear here while the page is open.'));
    }
  });
  // ------------------------------------------------------------------
  // Notification polling — every 30s, fetch unread notifications and
  // surface them in the chat panel with a badge on the toggle button.
  // ------------------------------------------------------------------
  let notificationsPollTimer = null;
  const seenNotificationIds = new Set();

  const pollNotifications = async () => {
    const session = readLocalRecord(sessionStorageKey);
    if (!session?.token) return;
    try {
      const items = await api('/api/notifications?unread=true&limit=20');

      // Filter out ones we've already shown this session.
      const fresh = items.filter((n) => !seenNotificationIds.has(String(n.id)));
      if (!fresh.length) return;

      // Show oldest first so the conversation reads top-to-bottom.
      fresh.reverse().forEach((n) => {
        seenNotificationIds.add(String(n.id));
        const message = rotomify(`${n.title} — ${n.body}`);
        if (/\b(delivered|delivery complete|arrived)\b/i.test(`${n.title} ${n.body}`)) {
          showDeliveryArrivalPopout(message);
        }
        addChatMessage(message);
      });

      // Light the badge if the panel isn't open.
      if (chatPanel?.hidden && chatUnread) chatUnread.hidden = false;

      // Mark each as read on the server.
      await Promise.all(
        fresh.map((n) =>
          api(`/api/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {})
        )
      );
    } catch (error) {
      // Silent — don't spam the console during demo if the backend hiccups.
    }
  };

  const startNotificationPolling = () => {
    pollNotifications();
    if (notificationsPollTimer) window.clearInterval(notificationsPollTimer);
    notificationsPollTimer = window.setInterval(pollNotifications, 30_000);
  };

  // Kick off once signed in, and whenever the page becomes visible again.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) pollNotifications();
  });

  addChatMessage(rotomify("Bzzt! Rotom Dex online! I scan listings, compare prices, and track your deliveries. Ask me 'how long is my delivery?' or 'cheapest burger'."));
  startNotificationPolling();
  if (chatUnread) chatUnread.hidden = true;

  const appendHighlighted = (parent, text, tokens) => {
    const parts = [...tokens]
      .sort((a, b) => b.length - a.length)
      .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!parts.length) {
      parent.append(text);
      return;
    }
    text.split(new RegExp(`(${parts.join('|')})`, 'gi')).forEach((piece, index) => {
      if (!piece) return;
      if (index % 2) {
        const mark = document.createElement('mark');
        mark.textContent = piece;
        parent.append(mark);
      } else {
        parent.append(piece);
      }
    });
  };

  const setActiveItem = (index, scroll = true) => {
    const options = itemSuggestionList ? [...itemSuggestionList.querySelectorAll('[role="option"]')] : [];
    activeItemIndex = options.length ? Math.max(-1, Math.min(index, options.length - 1)) : -1;
    options.forEach((option, i) => {
      const on = i === activeItemIndex;
      option.classList.toggle('is-active', on);
      option.setAttribute('aria-selected', String(on));
    });
    if (activeItemIndex >= 0) {
      itemSearch?.setAttribute('aria-activedescendant', options[activeItemIndex].id);
      if (scroll) options[activeItemIndex].scrollIntoView({ block: 'nearest' });
    } else {
      itemSearch?.removeAttribute('aria-activedescendant');
    }
  };

  const renderFoodCart = () => {
    if (!foodCartItems) return;
    foodCartItems.replaceChildren();
    const itemCount = foodCartContents.reduce((count, line) => count + line.quantity, 0);
    const subtotal = foodCartContents.reduce((amount, line) => amount + line.entry.price * line.quantity, 0);
    const isBazaarOrder = sellServiceField?.value === 'Online Bazaar';
    if (foodCartTitle) foodCartTitle.textContent = isBazaarOrder ? 'Your cart' : 'Your food order';
    if (foodCartCount) foodCartCount.textContent = `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
    if (foodCartTotal) foodCartTotal.textContent = `PHP ${subtotal.toFixed(2)}`;
    if (foodCartEmpty) foodCartEmpty.hidden = itemCount > 0;
    if (bazaarViewCartButton) {
      bazaarViewCartButton.hidden = !isBazaarOrder || itemCount === 0;
      bazaarViewCartButton.textContent = `View cart · ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
    }
    if (bazaarBackToBrowseButton) bazaarBackToBrowseButton.hidden = !isBazaarOrder;
    if (bazaarCheckoutButton) {
      bazaarCheckoutButton.hidden = !isBazaarOrder || itemCount === 0;
      bazaarCheckoutButton.textContent = `Continue to delivery checkout · PHP ${subtotal.toFixed(2)}`;
    }
    foodCartContents.forEach((line) => {
      const row = document.createElement('li');
      row.className = 'food-cart-line';
      const name = document.createElement('span');
      name.className = 'food-cart-line-name';
      name.textContent = line.entry.name;
      const price = document.createElement('span');
      price.className = 'food-cart-line-price';
      price.textContent = `PHP ${(line.entry.price * line.quantity).toFixed(2)}`;
      const quantity = document.createElement('div');
      quantity.className = 'food-cart-quantity';
      const decrease = document.createElement('button');
      decrease.type = 'button';
      decrease.textContent = '−';
      decrease.setAttribute('aria-label', `Remove one ${line.entry.name}`);
      decrease.disabled = line.quantity <= 1;
      decrease.addEventListener('click', () => {
        line.quantity -= 1;
        renderFoodCart();
      });
      const count = document.createElement('span');
      count.textContent = String(line.quantity);
      const increase = document.createElement('button');
      increase.type = 'button';
      increase.textContent = '+';
      increase.setAttribute('aria-label', `Add one ${line.entry.name}`);
      increase.addEventListener('click', () => {
        if (line.quantity < 50) line.quantity += 1;
        renderFoodCart();
      });
      quantity.append(decrease, count, increase);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'food-cart-remove';
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', `Remove ${line.entry.name} from cart`);
      remove.addEventListener('click', () => {
        foodCartContents = foodCartContents.filter((cartLine) => cartLine !== line);
        renderFoodCart();
      });
      row.append(name, quantity, price, remove);
      foodCartItems.append(row);
    });
    if (sellSubmit && sellIsFoodOrder) {
      sellSubmit.textContent = itemCount
        ? `Confirm order · PHP ${subtotal.toFixed(2)} (no payment)`
        : 'Add items to your cart';
      sellSubmit.disabled = itemCount === 0;
    } else if (sellSubmit && isBazaarOrder) {
      sellSubmit.textContent = `Place order · PHP ${subtotal.toFixed(2)} (COD)`;
      sellSubmit.disabled = itemCount === 0;
    }
  };

  const addToFoodCart = (entry) => {
    const existingLine = foodCartContents.find((line) => line.entry.name === entry.name);
    if (existingLine) {
      if (existingLine.quantity < 50) existingLine.quantity += 1;
    } else {
      foodCartContents.push({ entry, quantity: 1 });
    }
    if (sellServiceField?.value === 'Online Bazaar') {
      if (foodCart) foodCart.hidden = bazaarCurrentStep !== 'cart';
      setBazaarFlowStep(bazaarCurrentStep);
    } else if (foodCart) {
      foodCart.hidden = false;
    }
    renderFoodCart();
    if (itemSearchStatus) itemSearchStatus.textContent = `${entry.name} added to cart`;
  };

  const setBazaarFlowStep = (step) => {
    bazaarCurrentStep = step;
    bazaarFlowSteps?.querySelectorAll('[data-bazaar-step]').forEach((element) => {
      const current = element.dataset.bazaarStep === step;
      element.classList.toggle('is-current', current);
      element.setAttribute('aria-current', current ? 'step' : 'false');
    });
    if (itemFinder) itemFinder.hidden = step !== 'browse';
    if (foodCart) foodCart.hidden = step !== 'cart';
    if (bazaarCheckoutFields) bazaarCheckoutFields.hidden = step !== 'checkout';
  };

  const showBazaarCart = () => {
    if (foodCartContents.length === 0) return;
    setBazaarFlowStep('cart');
    foodCart?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const beginBazaarCheckout = () => {
    if (foodCartContents.length === 0) return;
    bazaarCheckoutStarted = true;
    setBazaarFlowStep('checkout');
    if (deliveryAddress?.value.trim()) scheduleDeliveryPreview();
    else deliveryAddress?.focus();
    bazaarCheckoutFields?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pickItem = (entry) => {
    if (!itemSearch || !itemName) return;
    itemSearch.value = entry.name;
    itemName.value = entry.name;
    if (itemRestaurant) {
      itemRestaurant.value = sellServiceField?.value === 'Food Express' ? entry.category : entry.seller || '';
    }
    if (itemCategory) itemCategory.value = entry.group;
    if (bazaarSelectedSeller) {
      bazaarSelectedSeller.textContent = entry.seller ? `Sold by ${entry.seller}` : '';
      bazaarSelectedSeller.hidden = sellServiceField?.value !== 'Online Bazaar' || !entry.seller;
    }
    if (itemPrice) {
      itemPrice.value = entry.price ? String(entry.price) : '';
      itemPrice.readOnly = Boolean(entry.price);
      itemPrice.placeholder = entry.price ? '' : 'Enter your budget';
    }
    const itemPriceLabel = document.querySelector('label[for="item-price"]');
    if (itemPriceLabel && sellServiceField?.value === 'Online Bazaar') {
      itemPriceLabel.textContent = entry.price ? 'Listing price (PHP)' : 'Your budget (PHP)';
    }
    itemSuggestionsDismissed = true;
    renderItemSuggestions(sellServiceField?.value || '', entry.name);
    if (itemSearchStatus) itemSearchStatus.textContent = `${entry.name} selected`;
    itemSearch.focus();
  };

  const renderItemCategories = (serviceName) => {
    if (!itemCategories) return;
    itemCategories.replaceChildren();
    if (serviceName === 'Food Express') {
      itemCategories.hidden = true;
      return;
    }
    itemCategories.hidden = false;
    ['All', ...new Set((itemCatalog[serviceName] || []).map((entry) => entry.category))].forEach((category) => {
      const button = document.createElement('button');
      button.className = 'item-category';
      button.type = 'button';
      const image = document.createElement('span');
      image.className = 'item-category-img';
      const isBanner = addConfiguredImage(image, categoryImages[category], categoryIcons[category] || 'default', 'item-category-banner');
      if (isBanner) {
        const banner = image.firstElementChild;
        image.removeChild(banner);
        button.classList.add('has-banner');
        button.append(banner);
      } else {
        button.append(image);
      }
      const label = document.createElement('span');
      label.className = 'item-category-label';
      label.textContent = category;
      button.append(label);
      button.setAttribute('aria-pressed', String(category === activeItemCategory));
      button.addEventListener('click', () => {
        activeItemCategory = category;
        if (itemRestaurant) {
          itemRestaurant.value = serviceName === 'Food Express' && category !== 'All' ? category : '';
        }
        itemSuggestionsDismissed = false;
        itemCategories.querySelectorAll('.item-category').forEach((chip) => {
          chip.setAttribute('aria-pressed', String(chip === button));
        });
        renderItemSuggestions(serviceName, itemSearch?.value || '');
      });
      itemCategories.append(button);
    });
  };

  const renderRestaurants = () => {
    if (!restaurantList) return;
    restaurantList.replaceChildren();
    restaurants.forEach((restaurant) => {
      const area = caintaAreas[restaurant.area];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'food-restaurant-card';
      const image = document.createElement('img');
      image.src = foodPhoto(restaurant.photo);
      image.alt = '';
      image.loading = 'lazy';
      const name = document.createElement('span');
      name.textContent = restaurant.name;
      const location = document.createElement('small');
      location.textContent = restaurant.address || `Approximate pickup · ${area?.label || restaurant.area}, Cainta`;
      card.append(image, name, location);
      card.addEventListener('click', () => {
        selectedRestaurant = restaurant;
        scheduleDeliveryPreview();
        if (sellTitle) sellTitle.textContent = `${restaurant.name} menu`;
        if (restaurantPicker) restaurantPicker.hidden = true;
        if (selectedRestaurantPanel) selectedRestaurantPanel.hidden = false;
        if (selectedRestaurantName) selectedRestaurantName.textContent = restaurant.name;
        if (selectedRestaurantLocation) {
          selectedRestaurantLocation.textContent = restaurant.address || `Approximate pickup · ${area?.label || restaurant.area}, Cainta`;
        }
        if (itemRestaurant) itemRestaurant.value = restaurant.name;
        if (itemCategory) itemCategory.value = 'Food';
        if (itemSearch) {
          itemSearch.value = '';
          itemSearch.placeholder = `Search ${restaurant.name} menu`;
        }
        if (bazaarSelectedSeller) bazaarSelectedSeller.hidden = true;
        if (itemName) itemName.value = '';
        foodCartContents = [];
        renderFoodCart();
        if (foodCart) foodCart.hidden = false;
        if (itemPrice) itemPrice.value = '';
        document.getElementById('item-details').value = '';
        activeItemCategory = restaurant.name;
        if (itemFinder) itemFinder.hidden = false;
        if (foodCheckoutFields) foodCheckoutFields.hidden = false;
        if (bazaarCheckoutFields) bazaarCheckoutFields.hidden = false;
        itemSuggestionsDismissed = false;
        renderItemSuggestions('Food Express');
        itemSearch?.focus();
      });
      restaurantList.append(card);
    });
  };

  const loadBazaarListingDetails = async (entry, trigger) => {
    if (entry.listingId && !entry.bazaarDetailsLoaded) {
      trigger.disabled = true;
      trigger.setAttribute('aria-busy', 'true');
      try {
        const details = await api(`/api/items/bazaar-listing/${encodeURIComponent(entry.listingId)}`);
        entry.description = details.description || entry.description || '';
        entry.stock = details.stock ?? entry.stock;
        entry.photos = Array.isArray(details.photos) ? details.photos : [];
        entry.photo = entry.photos[0] || '';
        entry.seller = details.seller || entry.seller;
        entry.sellerArea = details.seller_area || entry.sellerArea || '';
        entry.sellerDescription = details.seller_description || entry.sellerDescription || '';
        entry.sellerPhoto = details.seller_photo || '';
        entry.bazaarDetailsLoaded = true;
        entry.detailsLoadError = '';
      } catch (error) {
        console.error(`Could not load full details for Bazaar product ${entry.name}.`, error);
        entry.detailsLoadError = error.message || 'The full product details could not be loaded.';
      } finally {
        trigger.disabled = false;
        trigger.removeAttribute('aria-busy');
      }
    }
  };

  const openBazaarProductDetails = async (entry, trigger) => {
    if (!bazaarProductDetailsModal || !bazaarProductGallery) return;
    bazaarProductDetailsTrigger = trigger;
    await loadBazaarListingDetails(entry, trigger);
    const uploadedPhotos = Array.isArray(entry.photos)
      ? entry.photos.filter((photo) => typeof photo === 'string' && photo.startsWith('data:image/'))
      : [];
    let photoConfigs = uploadedPhotos.map((src) => ({ src, alt: `Seller photo of ${entry.name}` }));
    let representativePhoto = false;
    if (!photoConfigs.length) {
      representativePhoto = true;
      const configured = itemImages[entry.name] || bazaarProductPhoto(entry);
      if (configured?.src) photoConfigs.push(configured);
      const categoryPhotos = bazaarCategoryPhotos[entry.category] || bazaarCategoryPhotos.Other || [];
      categoryPhotos.forEach((photo, index) => {
        if (photoConfigs.length >= 3 || index === 0) return;
        const config = productPhoto(photo, `Representative category photo for ${entry.name}`);
        if (!photoConfigs.some((existing) => existing.src === config.src)) photoConfigs.push(config);
      });
    }

    bazaarProductGallery.replaceChildren();
    const mainPhoto = document.createElement('img');
    mainPhoto.className = 'bazaar-product-main-photo';
    mainPhoto.alt = photoConfigs[0]?.alt || `No photo available for ${entry.name}`;
    if (photoConfigs[0]?.src) {
      mainPhoto.src = photoConfigs[0].src;
    } else {
      mainPhoto.hidden = true;
      bazaarProductGallery.append(makeIcon(entry.icon));
    }
    bazaarProductGallery.append(mainPhoto);

    if (photoConfigs.length > 1) {
      const thumbnails = document.createElement('div');
      thumbnails.className = 'bazaar-product-thumbnails';
      photoConfigs.forEach((photo, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'bazaar-product-thumbnail';
        button.setAttribute('aria-label', `Show product photo ${index + 1}`);
        button.setAttribute('aria-pressed', String(index === 0));
        const image = document.createElement('img');
        image.src = photo.src;
        image.alt = '';
        button.append(image);
        button.addEventListener('click', () => {
          mainPhoto.src = photo.src;
          mainPhoto.alt = photo.alt || `Photo ${index + 1} of ${entry.name}`;
          thumbnails.querySelectorAll('button').forEach((thumbnail) => {
            thumbnail.setAttribute('aria-pressed', String(thumbnail === button));
          });
        });
        thumbnails.append(button);
      });
      bazaarProductGallery.append(thumbnails);
    }
    const photoCaption = document.createElement('small');
    photoCaption.className = 'bazaar-product-photo-caption';
    photoCaption.textContent = entry.detailsLoadError
      ? `Additional product details could not be loaded: ${entry.detailsLoadError}`
      : representativePhoto
        ? 'Representative category photos; this seller has not uploaded product photos.'
        : photoConfigs.length
          ? 'Product photos from the seller.'
          : 'No product photos are available.';
    bazaarProductGallery.append(photoCaption);

    document.getElementById('bazaar-product-category').textContent = entry.category || 'Product';
    document.getElementById('bazaar-product-details-title').textContent = entry.name;
    document.getElementById('bazaar-product-details-price').textContent = entry.price
      ? `PHP ${Number(entry.price).toFixed(2)}`
      : 'Price on request';
    const sellerButton = document.getElementById('bazaar-product-seller');
    sellerButton.textContent = entry.seller || 'Seller details not provided';
    sellerButton.disabled = !entry.seller;
    sellerButton.onclick = () => openBazaarSellerShop(entry, sellerButton);
    document.getElementById('bazaar-product-area').textContent = entry.sellerArea || 'Seller has not provided an area.';
    document.getElementById('bazaar-product-stock').textContent = Number.isFinite(entry.stock)
      ? `${entry.stock} available`
      : 'Availability not provided';
    document.getElementById('bazaar-product-description').textContent = entry.description
      || `${entry.name} is listed under ${entry.category || 'Online Bazaar'} by ${entry.seller || 'a local seller'}. Contact the seller to confirm the condition, available options, and pickup details.`;
    document.getElementById('bazaar-product-shop-description').textContent = entry.sellerDescription
      || 'Shop information has not been provided.';
    const shopPhoto = document.getElementById('bazaar-product-shop-photo');
    if (entry.sellerPhoto) {
      shopPhoto.src = entry.sellerPhoto;
      shopPhoto.alt = `${entry.seller || 'Seller'} shop photo`;
      shopPhoto.hidden = false;
    } else {
      shopPhoto.removeAttribute('src');
      shopPhoto.hidden = true;
    }
    const addButton = document.getElementById('bazaar-product-add');
    addButton.onclick = () => {
      addToFoodCart(entry);
      closeBazaarProductDetails();
    };
    bazaarProductDetailsModal.classList.toggle('above-seller-shop', bazaarSellerShopModal?.classList.contains('open'));
    bazaarProductDetailsModal.classList.add('open');
    bazaarProductDetailsModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    bazaarProductDetailsModal.querySelector('.sell-modal-close')?.focus();
  };

  const closeBazaarProductDetails = () => {
    if (!bazaarProductDetailsModal) return;
    bazaarProductDetailsModal.classList.remove('open');
    bazaarProductDetailsModal.classList.remove('above-seller-shop');
    bazaarProductDetailsModal.setAttribute('aria-hidden', 'true');
    if (!sellModal?.classList.contains('open')
      && !bazaarShopModal?.classList.contains('open')
      && !bazaarSellerShopModal?.classList.contains('open')) {
      document.body.classList.remove('modal-open');
    }
    bazaarProductDetailsTrigger?.focus();
  };

  const openBazaarSellerShop = async (entry, trigger) => {
    if (!bazaarSellerShopModal || !bazaarSellerShopProducts || !entry.seller) return;
    bazaarSellerShopTrigger = trigger;
    await loadBazaarListingDetails(entry, trigger);
    await catalogReady;

    document.getElementById('bazaar-seller-shop-title').textContent = entry.seller;
    document.getElementById('bazaar-seller-shop-area').textContent = entry.sellerArea || 'Serving Cainta, Rizal';
    document.getElementById('bazaar-seller-shop-description').textContent =
      entry.sellerDescription || 'This seller has not added a shop description yet.';
    const shopPhoto = document.getElementById('bazaar-seller-shop-photo');
    if (entry.sellerPhoto) {
      shopPhoto.src = entry.sellerPhoto;
      shopPhoto.alt = `${entry.seller} shop`;
      shopPhoto.hidden = false;
    } else {
      shopPhoto.removeAttribute('src');
      shopPhoto.hidden = true;
    }

    const products = (itemCatalog['Online Bazaar'] || []).filter((product) =>
      product.seller && product.seller.trim().toLocaleLowerCase() === entry.seller.trim().toLocaleLowerCase()
    );
    bazaarSellerShopProducts.replaceChildren();
    document.getElementById('bazaar-seller-shop-empty').hidden = products.length > 0;
    products.forEach((product) => {
      const card = document.createElement('article');
      card.className = 'bazaar-seller-shop-product';
      const image = document.createElement('span');
      image.className = 'bazaar-seller-shop-product-image';
      const imageConfig = (product.photo
        ? { src: product.photo, alt: `Photo of ${product.name}` }
        : null)
        || itemImages[product.name]
        || bazaarProductPhoto(product);
      addConfiguredImage(image, imageConfig, product.icon);
      const detailsButton = document.createElement('button');
      detailsButton.type = 'button';
      detailsButton.className = 'bazaar-seller-shop-product-open';
      detailsButton.setAttribute('aria-label', `View details for ${product.name}`);
      const name = document.createElement('strong');
      name.textContent = product.name;
      const category = document.createElement('span');
      category.textContent = product.category || 'Product';
      const price = document.createElement('span');
      price.className = 'bazaar-seller-shop-product-price';
      price.textContent = product.price
        ? `PHP ${Number(product.price).toFixed(2)}`
        : 'Price on request';
      detailsButton.append(image, name, category, price);
      detailsButton.addEventListener('click', () => openBazaarProductDetails(product, detailsButton));
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'food-menu-add marketplace-add-button';
      addButton.textContent = 'Add to cart';
      addButton.disabled = Number.isFinite(product.stock) && product.stock < 1;
      addButton.addEventListener('click', () => addToFoodCart(product));
      card.append(detailsButton, addButton);
      bazaarSellerShopProducts.append(card);
    });

    bazaarSellerShopModal.classList.add('open');
    bazaarSellerShopModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    bazaarSellerShopModal.querySelector('.sell-modal-close')?.focus();
  };

  const closeBazaarSellerShop = () => {
    if (!bazaarSellerShopModal) return;
    bazaarSellerShopModal.classList.remove('open');
    bazaarSellerShopModal.setAttribute('aria-hidden', 'true');
    if (!sellModal?.classList.contains('open')
      && !bazaarShopModal?.classList.contains('open')
      && !bazaarProductDetailsModal?.classList.contains('open')) {
      document.body.classList.remove('modal-open');
    }
    bazaarSellerShopTrigger?.focus();
  };

  const renderItemSuggestions = (serviceName, query = '') => {
    if (!itemSuggestions || !itemSuggestionList) return;
    itemSuggestions.classList.toggle('marketplace-listings', serviceName === 'Online Bazaar');
    itemSuggestionList.replaceChildren();
    activeItemIndex = -1;
    itemSearch?.removeAttribute('aria-activedescendant');

    const result = findItemMatches(serviceName, query, activeItemCategory);
    itemMatches = result.entries;
    const typed = query.trim().length > 0;

    if (itemSuggestionsDismissed || (!result.entries.length && !typed)) {
      itemSuggestions.hidden = true;
      itemSearch?.setAttribute('aria-expanded', 'false');
      if (itemSearchStatus) itemSearchStatus.textContent = '';
      return;
    }

    itemSuggestions.hidden = false;
    itemSearch?.setAttribute('aria-expanded', 'true');

    if (!result.entries.length) {
      itemSuggestionsLabel.textContent = 'No matches';
      const empty = document.createElement('li');
      empty.className = 'item-suggestion-empty';
      empty.setAttribute('role', 'presentation');
      empty.textContent = activeItemCategory === 'All'
        ? 'We could not find that. You can still type your own item and send the request.'
        : `Nothing in ${activeItemCategory} matches. Try All, or type your own item.`;
      itemSuggestionList.append(empty);
      if (itemSearchStatus) itemSearchStatus.textContent = 'No matching items';
      return;
    }

    itemSuggestionsLabel.textContent = result.label;
    result.entries.forEach((entry, index) => {
      const row = document.createElement('li');
      row.className = 'item-suggestion';
      if (serviceName === 'Online Bazaar') row.classList.add('marketplace-listing');
      row.id = `item-option-${index}`;
      if (!sellIsFoodOrder && serviceName !== 'Online Bazaar') {
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', 'false');
      }

      const image = document.createElement('span');
      image.className = 'item-suggestion-img';
      const menuPhoto = serviceName === 'Food Express'
        ? foodPhotosByMenu.find(({ terms }) => terms.some((term) => entry.name.toLocaleLowerCase().includes(term)))?.photo
          || restaurants.find((restaurant) => restaurant.name === entry.category)?.photo
        : null;
      const imageConfig = (serviceName === 'Online Bazaar' && entry.photo
          ? { src: entry.photo, alt: `Photo of ${entry.name}`, type: 'icon' }
          : null)
        || itemImages[entry.name]
        || (serviceName === 'Online Bazaar' ? bazaarProductPhoto(entry) : null)
        || (menuPhoto ? { src: foodPhoto(menuPhoto), type: 'icon' } : null);
      const isBanner = addConfiguredImage(image, imageConfig, entry.icon, 'item-suggestion-banner');
      if (isBanner) {
        const banner = image.firstElementChild;
        image.removeChild(banner);
        row.classList.add('has-banner');
        row.append(banner);
      } else {
        row.append(image);
      }

      const text = document.createElement('span');
      text.className = 'item-suggestion-text';
      const name = document.createElement('span');
      name.className = 'item-suggestion-name';
      appendHighlighted(name, entry.name, result.tokens);
      const meta = document.createElement('span');
      meta.className = 'item-suggestion-meta';
      meta.textContent = serviceName === 'Food Express'
        ? `PHP ${Number(entry.price).toFixed(2)} each`
        : serviceName === 'Online Bazaar'
          ? `${entry.price ? `PHP ${Number(entry.price).toFixed(2)}` : 'Price on request'}${entry.stock ? ` · ${entry.stock} available` : ''}`
          : entry.category;
      text.append(name, meta);
      if (serviceName === 'Online Bazaar') {
        const detailsButton = document.createElement('button');
        detailsButton.type = 'button';
        detailsButton.className = 'marketplace-product-open';
        detailsButton.setAttribute('aria-label', `View details for ${entry.name}`);
        detailsButton.append(image, text);
        detailsButton.addEventListener('click', () => openBazaarProductDetails(entry, detailsButton));
        row.append(detailsButton);
        if (entry.seller) {
          const sellerButton = document.createElement('button');
          sellerButton.type = 'button';
          sellerButton.className = 'bazaar-listing-seller';
          sellerButton.textContent = `Visit ${entry.seller}'s shop`;
          sellerButton.addEventListener('click', () => openBazaarSellerShop(entry, sellerButton));
          row.append(sellerButton);
        }
      } else {
        row.append(image, text);
      }

      if (sellIsFoodOrder || serviceName === 'Online Bazaar') {
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'food-menu-add';
        addButton.textContent = serviceName === 'Online Bazaar' ? 'Add to cart' : 'Add';
        if (serviceName === 'Online Bazaar') addButton.classList.add('marketplace-add-button');
        addButton.setAttribute('aria-label', `Add ${entry.name} to cart for PHP ${entry.price}`);
        addButton.addEventListener('click', () => addToFoodCart(entry));
        row.append(addButton);
      } else {
        row.addEventListener('mousedown', (event) => event.preventDefault());
        row.addEventListener('click', () => pickItem(entry));
        row.addEventListener('mousemove', () => {
          if (activeItemIndex !== index) setActiveItem(index, false);
        });
      }
      itemSuggestionList.append(row);
    });
    if (itemSearchStatus) {
      itemSearchStatus.textContent = serviceName === 'Online Bazaar'
        ? `${result.entries.length} product listing${result.entries.length === 1 ? '' : 's'} available`
        : `${result.entries.length} suggestion${result.entries.length > 1 ? 's' : ''} available`;
    }
  };

  const openSellModal = (serviceName, trigger) => {
    if (!sellModal || !sellForm || !sellServiceField || !sellTitle || !sellSubtitle) return;
    sellForm.reset();
    selectedDeliverySuggestion = null;
    setDeliveryBarangayRequired(false);
    bazaarCheckoutStarted = false;
    hideDeliveryAddressSuggestions();
    sellForm.hidden = false;
    try {
      const session = readLocalRecord(sessionStorageKey);
      const profile = session?.email ? getUserProfile(session) : null;
      const account = session?.email ? readLocalRecord(accountStorageKey) : null;
      if (profile?.address && deliveryAddress) deliveryAddress.value = profile.address;
      const contact = document.getElementById('seller-contact');
      if (contact && (account?.phone || session?.email)) contact.value = account?.phone || session.email;
    } catch (error) {
      console.error('Could not autofill the saved delivery profile.', error);
    }
    sellIsFoodOrder = serviceName === 'Food Express';
    const isBazaarOrder = serviceName === 'Online Bazaar';
    sellModalDialog?.classList.toggle('marketplace-modal', serviceName === 'Online Bazaar');
    sellModalDialog?.classList.toggle('food-order-modal', sellIsFoodOrder);
    selectedRestaurant = sellIsFoodOrder ? null : { name: 'Cainta One Express', area: 'Junction' };
    foodCartContents = [];
    renderFoodCart();
    sellTitle.textContent = serviceName === 'Food Express' ? 'Choose a restaurant' : 'Shop by product';
    sellServiceField.value = serviceName;
    sellSubtitle.textContent = sellIsFoodOrder
      ? 'Choose a Cainta restaurant, browse its menu, and view delivery progress after confirming your order.'
      : 'Find products, review your cart, then choose a Cainta delivery address and preview the route.';
    if (itemRestaurant) itemRestaurant.value = '';
    if (bazaarSelectedSeller) {
      bazaarSelectedSeller.textContent = '';
      bazaarSelectedSeller.hidden = true;
    }
    if (itemCategory) {
      itemCategory.value = serviceName === 'Food Express' ? 'Food' : 'Fashion';
    }
    sellSuccess.hidden = true;
    if (orderAuthPrompt) orderAuthPrompt.hidden = true;
    if (orderAuthMessage) orderAuthMessage.textContent = '';
    if (sellSuccess) sellSuccess.textContent = 'Order confirmed. No payment was collected.';
    if (deliveryEstimate) deliveryEstimate.hidden = true;
    if (deliveryEstimateTitle) deliveryEstimateTitle.textContent = 'Your delivery route';
    deliveryEstimateSummary && (deliveryEstimateSummary.textContent = '');
    deliveryEstimateStatus && (deliveryEstimateStatus.textContent = '');
    deliveryMapLink && (deliveryMapLink.hidden = true);
    if (deliveryMap) {
      deliveryMap.remove();
      deliveryMap = null;
    }
    if (deliverySimulationTimer) {
      window.clearInterval(deliverySimulationTimer);
      deliverySimulationTimer = null;
    }
    deliveryDriverMarker = null;
    sellTriggerToRestoreFocus = trigger;
    activeItemCategory = 'All';
    itemSuggestionsDismissed = false;
    if (restaurantPicker) restaurantPicker.hidden = !sellIsFoodOrder;
    if (selectedRestaurantPanel) selectedRestaurantPanel.hidden = true;
    if (itemFinder) itemFinder.hidden = sellIsFoodOrder;
    if (foodCheckoutFields) foodCheckoutFields.hidden = sellIsFoodOrder;
    if (bazaarFlowSteps) bazaarFlowSteps.hidden = !isBazaarOrder;
    if (bazaarCheckoutFields) bazaarCheckoutFields.hidden = isBazaarOrder;
    if (bazaarItemFields) bazaarItemFields.hidden = true;
    if (foodCart) foodCart.hidden = true;
    if (paymentDemoNote) paymentDemoNote.hidden = !sellIsFoodOrder;
    if (itemSearch) itemSearch.placeholder = sellIsFoodOrder ? 'Choose a restaurant first' : 'Search products, e.g. T-shirt or sneakers';
    const itemSearchLabel = document.querySelector('label[for="item-search"]');
    if (itemSearchLabel) itemSearchLabel.textContent = sellIsFoodOrder ? 'Search menu' : 'Search products';
    const itemNameLabel = document.querySelector('label[for="item-name"]');
    if (itemNameLabel) itemNameLabel.textContent = sellIsFoodOrder ? 'Menu item' : 'Selected product';
    if (itemName) itemName.readOnly = false;
    if (itemPrice) {
      itemPrice.readOnly = false;
      itemPrice.placeholder = 'Enter your budget';
    }
    const itemPriceLabel = document.querySelector('label[for="item-price"]');
    if (itemPriceLabel) itemPriceLabel.textContent = sellIsFoodOrder ? 'Fixed price each (PHP)' : 'Your budget (PHP)';
    if (sellSubmit) {
      sellSubmit.disabled = false;
      sellSubmit.textContent = sellIsFoodOrder ? 'Confirm order (no payment)' : 'Place order (COD)';
    }
    if (isBazaarOrder) setBazaarFlowStep('browse');
    if (foodCartEmpty) foodCartEmpty.textContent = sellIsFoodOrder
      ? 'Add dishes from the menu to start your order.'
      : 'Add products to your cart to continue.';
    renderFoodCart();
    renderRestaurants();
    renderItemCategories(serviceName);
    renderItemSuggestions(serviceName);
    sellModal.classList.add('open');
    sellModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    if (sellIsFoodOrder) restaurantList?.querySelector('button')?.focus();
    else {
      itemSearch?.focus();
    }
  };

  const closeSellModal = () => {
    if (!sellModal) return;
    sellModal.classList.remove('open');
    sellModal.setAttribute('aria-hidden', 'true');
    if (!bazaarShopModal?.classList.contains('open')
      && !bazaarProductDetailsModal?.classList.contains('open')
      && !bazaarSellerShopModal?.classList.contains('open')) {
      document.body.classList.remove('modal-open');
    }
    sellTriggerToRestoreFocus?.focus();
  };

  let bazaarShopTrigger = null;
  const renderBazaarShopProducts = (products) => {
    if (!bazaarShopItemList || !bazaarShopEmpty) return;
    bazaarShopItemList.replaceChildren();
    bazaarShopEmpty.hidden = products.length > 0;
    products.forEach((product) => {
      const row = document.createElement('li');
      const name = document.createElement('strong');
      name.textContent = product.name;
      const info = document.createElement('span');
      info.textContent = `PHP ${Number(product.price).toFixed(2)} · ${product.stock} in stock`;
      row.append(name, info);
      bazaarShopItemList.append(row);
    });
  };
  const closeBazaarShopModal = () => {
    if (!bazaarShopModal) return;
    bazaarShopModal.classList.remove('open');
    bazaarShopModal.setAttribute('aria-hidden', 'true');
    if (!sellModal?.classList.contains('open')
      && !bazaarProductDetailsModal?.classList.contains('open')
      && !bazaarSellerShopModal?.classList.contains('open')) {
      document.body.classList.remove('modal-open');
    }
    bazaarShopTrigger?.focus();
  };
  const loadBazaarShop = async () => {
    if (!bazaarShopForm || !bazaarShopProducts) return;
    bazaarShop = null;
    bazaarShopProductsData = [];
    bazaarShopForm.hidden = true;
    bazaarShopProducts.hidden = true;
    bazaarShopAuthMessage.hidden = true;
    setBazaarShopMessage('');
    try {
      const result = await api('/api/items/bazaar-shop');
      bazaarShop = result.shop;
      bazaarShopProductsData = result.products || [];
      bazaarShopForm.hidden = false;
      bazaarShopForm.elements.name.value = bazaarShop?.name || '';
      bazaarShopForm.elements.area.value = bazaarShop?.area || '';
      bazaarShopForm.elements.description.value = bazaarShop?.description || '';
      if (bazaarShopPhotoPreview) {
        bazaarShopPhotoPreview.src = bazaarShop?.photo || '';
        bazaarShopPhotoPreview.hidden = !bazaarShop?.photo;
      }
      if (bazaarShop) {
        bazaarShopProducts.hidden = false;
        renderBazaarShopProducts(bazaarShopProductsData);
        document.getElementById('bazaar-products-heading').textContent = 'Add a product';
      }
    } catch (error) {
      if (error.status === 401) {
        bazaarShopAuthMessage.hidden = false;
      } else {
        console.error('Could not load the Bazaar shop profile.', error);
        setBazaarShopMessage(error.message || 'Could not load your shop. Please try again.', true);
        bazaarShopForm.hidden = false;
      }
    }
  };
  document.querySelectorAll('[data-open-bazaar-shop]').forEach((button) => {
    button.addEventListener('click', () => {
      bazaarShopTrigger = button;
      bazaarShopModal?.classList.add('open');
      bazaarShopModal?.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      loadBazaarShop();
    });
  });
  document.querySelectorAll('[data-close-bazaar-shop]').forEach((button) => {
    button.addEventListener('click', closeBazaarShopModal);
  });
  bazaarShopModal?.addEventListener('click', (event) => {
    if (event.target === bazaarShopModal) closeBazaarShopModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && bazaarSellerShopModal?.classList.contains('open')) {
      closeBazaarSellerShop();
    } else if (event.key === 'Escape' && bazaarShopModal?.classList.contains('open')) {
      closeBazaarShopModal();
    } else if (event.key === 'Escape' && bazaarProductDetailsModal?.classList.contains('open')) {
      closeBazaarProductDetails();
    }
  });

  const compressBazaarPhoto = (file) => new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      reject(new Error('Choose a JPEG, PNG, or WebP product photo.'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Choose a product photo smaller than 5 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The selected product photo could not be read.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('The selected product photo could not be opened.'));
      image.onload = () => {
        let scale = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('This browser could not resize the product photo.'));
          return;
        }
        let compressed = '';
        while (scale >= 0.2) {
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          compressed = canvas.toDataURL('image/png');
          if (compressed.length <= 500000) break;
          scale *= 0.8;
        }
        if (compressed.length > 500000) {
          reject(new Error('This photo is still too large after resizing. Choose a smaller image.'));
          return;
        }
        resolve(compressed);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

  bazaarShopPhoto?.addEventListener('change', async () => {
    const file = bazaarShopPhoto.files?.[0];
    if (!file) return;
    bazaarShopPhotoProcessing = true;
    const submitButton = bazaarShopForm?.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    try {
      pendingBazaarShopPhoto = await compressBazaarPhoto(file);
      bazaarShopPhotoPreview.src = pendingBazaarShopPhoto;
      bazaarShopPhotoPreview.hidden = false;
      setBazaarShopMessage('');
    } catch (error) {
      console.error('Could not prepare the Bazaar shop photo.', error);
      setBazaarShopMessage(error.message, true);
      bazaarShopPhoto.value = '';
    } finally {
      bazaarShopPhotoProcessing = false;
      if (submitButton) submitButton.disabled = false;
    }
  });
  bazaarProductPhotos?.addEventListener('change', async () => {
    pendingBazaarProductPhotos = [];
    bazaarProductPhotoPreviews?.replaceChildren();
    setBazaarListingMessage('');
    const files = Array.from(bazaarProductPhotos.files || []);
    if (files.length > 3) {
      setBazaarListingMessage('Choose up to 3 product photos.', true);
      bazaarProductPhotos.value = '';
      return;
    }
    if (!files.length) return;
    bazaarPhotosProcessing = true;
    const submitButton = bazaarProductForm?.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    try {
      pendingBazaarProductPhotos = await Promise.all(files.map(compressBazaarPhoto));
      pendingBazaarProductPhotos.forEach((photo, index) => {
        const preview = document.createElement('img');
        preview.className = 'listing-photo-preview';
        preview.src = photo;
        preview.alt = `Product photo ${index + 1} preview`;
        bazaarProductPhotoPreviews?.append(preview);
      });
    } catch (error) {
      console.error('Could not prepare the Bazaar product photos.', error);
      setBazaarListingMessage(error.message, true);
      bazaarProductPhotos.value = '';
      pendingBazaarProductPhotos = [];
      bazaarProductPhotoPreviews?.replaceChildren();
    } finally {
      bazaarPhotosProcessing = false;
      if (submitButton) submitButton.disabled = false;
    }
  });
  document.querySelectorAll('[data-close-bazaar-details]').forEach((button) => {
    button.addEventListener('click', closeBazaarProductDetails);
  });
  document.querySelectorAll('[data-close-bazaar-seller-shop]').forEach((button) => {
    button.addEventListener('click', closeBazaarSellerShop);
  });
  bazaarSellerShopModal?.addEventListener('click', (event) => {
    if (event.target === bazaarSellerShopModal) closeBazaarSellerShop();
  });
  bazaarProductDetailsModal?.addEventListener('click', (event) => {
    if (event.target === bazaarProductDetailsModal) closeBazaarProductDetails();
  });

  document.querySelectorAll('.sell-trigger').forEach((button) => {
    button.addEventListener('click', () => {
      const serviceName = button.dataset.service;
      if (serviceName) openSellModal(serviceName, button);
    });
  });

  changeRestaurantButton?.addEventListener('click', () => {
    selectedRestaurant = null;
    if (sellTitle) sellTitle.textContent = 'Choose a restaurant';
    if (restaurantPicker) restaurantPicker.hidden = false;
    if (selectedRestaurantPanel) selectedRestaurantPanel.hidden = true;
    if (itemFinder) itemFinder.hidden = true;
    if (foodCheckoutFields) foodCheckoutFields.hidden = true;
    foodCartContents = [];
    renderFoodCart();
    if (foodCart) foodCart.hidden = true;
    if (itemRestaurant) itemRestaurant.value = '';
    if (itemName) itemName.value = '';
    if (itemSearch) itemSearch.value = '';
    if (itemPrice) itemPrice.value = '';
    document.getElementById('item-details').value = '';
    itemSuggestionsDismissed = false;
  });

  bazaarCheckoutButton?.addEventListener('click', beginBazaarCheckout);
  bazaarViewCartButton?.addEventListener('click', showBazaarCart);
  bazaarBackToBrowseButton?.addEventListener('click', () => {
    setBazaarFlowStep('browse');
    itemSearch?.focus();
  });
  bazaarBackToCartButton?.addEventListener('click', () => {
    bazaarCheckoutStarted = false;
    setBazaarFlowStep('cart');
    itemSearch?.focus();
  });

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', closeSellModal);
  });

  sellModal?.addEventListener('click', (event) => {
    if (event.target === sellModal) closeSellModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sellModal?.classList.contains('open')) {
      closeSellModal();
    }
  });

  itemSearch?.addEventListener('input', (event) => {
    const value = event.target.value.trim();
    if (itemName) {
      itemName.value = value;
      itemName.setCustomValidity('');
    }
    if (itemPrice) {
      itemPrice.value = '';
      itemPrice.readOnly = false;
    }
    const itemPriceLabel = document.querySelector('label[for="item-price"]');
    if (itemPriceLabel && sellServiceField?.value === 'Online Bazaar') itemPriceLabel.textContent = 'Your budget (PHP)';
    if (itemRestaurant && sellServiceField?.value === 'Online Bazaar') itemRestaurant.value = '';
    if (bazaarSelectedSeller) bazaarSelectedSeller.hidden = true;
    itemSuggestionsDismissed = false;
    renderItemSuggestions(sellServiceField?.value || '', value);
  });
  itemName?.addEventListener('input', () => itemName.setCustomValidity(''));
  itemPrice?.addEventListener('input', () => itemPrice.setCustomValidity(''));

  // Arrow keys move through the suggestions, Enter picks the highlighted one.
  itemSearch?.addEventListener('keydown', (event) => {
    if (sellIsFoodOrder) return;
    const open = itemSuggestions && !itemSuggestions.hidden && itemMatches.length > 0;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        itemSuggestionsDismissed = false;
        renderItemSuggestions(sellServiceField?.value || '', itemSearch.value);
        setActiveItem(0);
        return;
      }
      setActiveItem(activeItemIndex + 1 >= itemMatches.length ? 0 : activeItemIndex + 1);
    } else if (event.key === 'ArrowUp' && open) {
      event.preventDefault();
      setActiveItem(activeItemIndex <= 0 ? itemMatches.length - 1 : activeItemIndex - 1);
    } else if (event.key === 'Enter' && open && activeItemIndex >= 0) {
      event.preventDefault();
      if (sellServiceField?.value === 'Online Bazaar') {
        addToFoodCart(itemMatches[activeItemIndex]);
      } else {
        pickItem(itemMatches[activeItemIndex]);
      }
    }
  });

  bazaarShopForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (bazaarShopPhotoProcessing) {
      setBazaarShopMessage('Please wait for the shop photo to finish processing.', true);
      return;
    }
    const values = new FormData(bazaarShopForm);
    const name = String(values.get('name') || '').trim();
    const area = String(values.get('area') || '');
    const description = String(values.get('description') || '').trim();
    if (!name || !area || !description) {
      setBazaarShopMessage('Add a shop name, Cainta area, and shop description.', true);
      return;
    }

    const submitButton = bazaarShopForm.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    setBazaarShopMessage('Saving shop...');
    try {
      const saved = await api('/api/items/bazaar-shop', {
        method: 'POST',
        body: JSON.stringify({
          name,
          area,
          description,
          photo: pendingBazaarShopPhoto || bazaarShop?.photo || null,
        }),
      });
      bazaarShop = saved.shop;
      pendingBazaarShopPhoto = '';
      bazaarShopProducts.hidden = false;
      renderBazaarShopProducts(bazaarShopProductsData);
      setBazaarShopMessage('Shop saved. You can now publish products.');
    } catch (error) {
      console.error('Could not save the Bazaar shop profile.', error);
      setBazaarShopMessage(error.message || 'Could not save your shop. Please try again.', true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  bazaarProductForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!bazaarShop) {
      setBazaarListingMessage('Save your shop profile before publishing products.', true);
      return;
    }
    if (bazaarPhotosProcessing) {
      setBazaarListingMessage('Please wait for the product photos to finish processing.', true);
      return;
    }
    const values = new FormData(bazaarProductForm);
    const name = String(values.get('name') || '').trim();
    const category = String(values.get('category') || '');
    const description = String(values.get('description') || '').trim();
    const price = Number(values.get('price'));
    const stock = Number(values.get('stock'));
    if (!name || !category || !description || !Number.isFinite(price) || price < 1 || !Number.isInteger(stock) || stock < 1) {
      setBazaarListingMessage('Enter a valid product name, category, price, stock, and description.', true);
      return;
    }

    const submitButton = bazaarProductForm.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    setBazaarListingMessage('Publishing product...');
    try {
      const created = await api('/api/items/bazaar-listing', {
        method: 'POST',
        body: JSON.stringify({
          name,
          category,
          price,
          stock,
          description,
          photos: pendingBazaarProductPhotos,
        }),
      });
      const group = ['Clothing', 'Shoes', 'Bags', 'Accessories'].includes(category)
        ? 'Fashion'
        : category === 'Home' ? 'Home' : 'Other';
      const entry = item(created.name, category, group, description, false, Number(created.price), created.seller);
      entry.listingId = created.id;
      entry.stock = Number(created.stock);
      entry.description = created.description;
      entry.photos = created.photos;
      entry.photo = created.photos[0] || '';
      entry.sellerArea = created.seller_area;
      entry.sellerDescription = created.seller_description;
      entry.sellerPhoto = created.seller_photo;
      entry.bazaarDetailsLoaded = true;
      itemCatalog['Online Bazaar'].push(entry);
      bazaarShopProductsData.unshift({
        ...created,
        category,
      });
      renderBazaarShopProducts(bazaarShopProductsData);
      bazaarProductForm.reset();
      pendingBazaarProductPhotos = [];
      bazaarProductPhotoPreviews?.replaceChildren();
      setBazaarListingMessage(`${created.name} is now listed in Online Bazaar.`);
      if (sellModal?.classList.contains('open') && sellServiceField?.value === 'Online Bazaar') {
        renderItemSuggestions('Online Bazaar', itemSearch?.value || '');
      }
    } catch (error) {
      console.error('Could not publish the Bazaar product.', error);
      setBazaarListingMessage(error.message || 'Could not publish this product. Please try again.', true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  sellForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const isBazaarOrder = sellServiceField?.value === 'Online Bazaar';
    if (sellIsFoodOrder && foodCartContents.length === 0) {
      if (deliveryEstimateStatus) deliveryEstimateStatus.textContent = 'Add at least one menu item to your cart before checkout.';
      return;
    }
    if (isBazaarOrder && foodCartContents.length === 0) {
      if (deliveryEstimateStatus) deliveryEstimateStatus.textContent = 'Add at least one product to your cart before checkout.';
      return;
    }
    if (isBazaarOrder && foodCartContents.some((line) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(line.entry.listingId || ''))) {
      if (deliveryEstimateStatus) deliveryEstimateStatus.textContent = 'One or more products are not connected to a valid catalog record. Refresh the catalog before placing this order.';
      return;
    }
    if (!sellIsFoodOrder && !isBazaarOrder && !itemName?.value.trim()) {
      itemName?.setCustomValidity('Enter the item you want to request.');
      itemName?.reportValidity();
      return;
    }
    if (!sellIsFoodOrder && !isBazaarOrder && (!itemPrice || !Number.isFinite(itemPrice.valueAsNumber) || itemPrice.valueAsNumber < 1)) {
      itemPrice?.setCustomValidity('Enter a budget of at least PHP 1.');
      itemPrice?.reportValidity();
      return;
    }
    let session;
    try {
      session = readLocalRecord(sessionStorageKey);
    } catch (error) {
      console.error('Could not verify the signed-in account before checkout.', error);
      if (deliveryEstimateStatus) deliveryEstimateStatus.textContent = 'Could not verify your account. Please refresh the page and try again.';
      return;
    }
    if (!session?.email) {
      if (orderAuthPrompt) {
        orderAuthPrompt.hidden = false;
        if (orderAuthMessage) orderAuthMessage.textContent = '';
        orderAuthPrompt.querySelector('a')?.focus();
      } else if (deliveryEstimateStatus) {
        deliveryEstimateStatus.textContent = 'Sign in or create an account before placing your order.';
      }
      return;
    }
    if (sellSubmit) {
      sellSubmit.disabled = true;
      sellSubmit.textContent = sellIsFoodOrder || isBazaarOrder ? 'Preparing checkout...' : 'Calculating route...';
    }
    try {
      await api('/api/auth/me');
      await estimateDeliveryRoute();
      if (sellSuccess) {
        const total = foodCartContents.reduce((amount, line) => amount + line.entry.price * line.quantity, 0);
        const orderSummary = foodCartContents.map((line) => `${line.quantity} × ${line.entry.name}`).join(', ');
        sellSuccess.textContent = `${isBazaarOrder ? 'Bazaar order' : 'Order'} confirmed${orderSummary ? `: ${orderSummary} · PHP ${total.toFixed(2)}` : ''}. Cash on delivery; no payment was collected. Delivery to: ${deliveryAddress.value.trim()}.`;
        sellSuccess.hidden = false;
        sellForm.hidden = true;
      }
    } catch (error) {
      if (deliveryEstimate) deliveryEstimate.hidden = false;
      if (error.status === 401) {
        if (orderAuthPrompt) orderAuthPrompt.hidden = false;
        if (orderAuthMessage) {
          orderAuthMessage.textContent = 'Your sign-in expired. Sign in again in the new tab, then return here and continue your order.';
        }
        if (deliveryEstimateStatus) deliveryEstimateStatus.textContent = 'Your sign-in expired, so the order and tracking were not started. Sign in again and retry.';
      } else if (deliveryEstimateStatus) {
        deliveryEstimateStatus.textContent = error.message;
      }
    } finally {
      if (sellSubmit) {
        sellSubmit.disabled = false;
        sellSubmit.textContent = (sellIsFoodOrder || isBazaarOrder) && sellSuccess && !sellSuccess.hidden
          ? 'Order confirmed'
          : sellIsFoodOrder ? 'Confirm order (no payment)' : isBazaarOrder ? 'Place order (COD)' : 'Send Order Request';
      }
    }
  });
  orderAuthContinue?.addEventListener('click', () => {
    try {
      const session = readLocalRecord(sessionStorageKey);
      if (!session?.email) {
        if (orderAuthMessage) orderAuthMessage.textContent = 'You are not signed in yet. Sign in or create an account in the new tab, then try again.';
        return;
      }
      if (orderAuthPrompt) orderAuthPrompt.hidden = true;
      if (orderAuthMessage) orderAuthMessage.textContent = '';
      sellForm?.requestSubmit();
    } catch (error) {
      console.error('Could not verify the signed-in account before continuing checkout.', error);
      if (orderAuthMessage) orderAuthMessage.textContent = 'Could not verify your account. Please refresh the page and try again.';
    }
  });
  orderAuthBack?.addEventListener('click', () => {
    if (orderAuthPrompt) orderAuthPrompt.hidden = true;
    sellSubmit?.focus();
  });

  /* ============================================================
     LIVE BACKGROUND + SCROLL EFFECTS
     ============================================================ */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 1. Mark elements for scroll reveal + parallax -------------------
  const revealTargets = [
    '.hero .eyebrow', '.hero h1', '.hero p', '.hero-actions', '.hero-metrics',
    '.section-head', '.service-card', '.feature-panel', '.stat-card',
    '.process-step', '.cta'
  ];

  revealTargets.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('reveal');
      el.style.setProperty('--delay', `${(i % 4) * 0.1}s`);
    });
  });

  // element -> parallax speed (positive = drifts slower than page, negative = faster)
  const parallaxMap = [
    ['.hero-grid > div:first-child', 0.10],
    ['.hero-visual', -0.08],
    ['.section-head', 0.06],
    ['.feature-panel', 0.05],
    ['.stats-box', -0.05],
    ['.service-card:nth-child(2)', 0.05],
    ['.process-step:nth-child(even)', 0.05],
    ['.cta', 0.04]
  ];

  const parallaxEls = [];
  parallaxMap.forEach(([sel, speed]) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.dataset.parallax = speed;
      parallaxEls.push({ el, speed, base: 0 });
    });
  });

  const measure = () => {
    parallaxEls.forEach((p) => {
      p.el.style.translate = 'none';
      const r = p.el.getBoundingClientRect();
      p.base = r.top + window.scrollY + r.height / 2; // page-Y of element centre
    });
  };

  // ---- 2. Reveal on scroll ---------------------------------------------
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
  }

  // ---- 3. Background layers: scroll + mouse parallax -------------------
  const layers = [...document.querySelectorAll('.bg-live .layer')];
  let mouseX = 0, mouseY = 0, smoothMX = 0, smoothMY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  // ---- 4. One animation loop, eased towards the real scroll position ----
  let targetY = window.scrollY;
  let currentY = targetY;

  window.addEventListener('scroll', () => { targetY = window.scrollY; }, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  measure();

  const frame = () => {
    currentY += (targetY - currentY) * 0.09;   // floaty easing
    smoothMX += (mouseX - smoothMX) * 0.05;
    smoothMY += (mouseY - smoothMY) * 0.05;

    if (!reduceMotion) {
      layers.forEach((layer) => {
        const speed = parseFloat(layer.dataset.speed) || 0.1;
        const mouse = parseFloat(layer.dataset.mouse) || 0;
        layer.style.setProperty('--sy', (currentY * speed).toFixed(2));
        layer.style.setProperty('--mx', (smoothMX * mouse).toFixed(2));
        layer.style.setProperty('--my', (smoothMY * mouse).toFixed(2));
      });

      const viewMid = currentY + window.innerHeight / 2;
      parallaxEls.forEach((p) => {
        const offset = (p.base - viewMid) * p.speed;
        p.el.style.translate = `0 ${offset.toFixed(1)}px`;
      });
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
});