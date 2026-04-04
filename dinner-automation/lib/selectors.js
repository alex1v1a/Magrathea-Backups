/**
 * CSS Selectors - Centralized Selector Definitions
 * 
 * Provides maintainable, versioned CSS selectors for HEB and Facebook
 * automation. Organized by page/component with fallback chains.
 * 
 * @module lib/selectors
 * 
 * @example
 * const { HEB_SELECTORS, FB_SELECTORS } = require('./selectors');
 * 
 * // Use primary selector with fallbacks
 * const button = await smartSelector(page, HEB_SELECTORS.cart.addButton);
 */

// ═══════════════════════════════════════════════════════════════
// HEB Selectors
// ═══════════════════════════════════════════════════════════════

const HEB_SELECTORS = {
  // Navigation & Header
  header: {
    cartLink: [
      'a[data-testid="cart-link"]',
      'a[href*="/cart"]',
      '[data-testid="cart-badge"]',
      '.CartLink_cartBadge'
    ],
    accountMenu: [
      'a[data-testid="account-menu"]',
      'a[href*="/my-account"]',
      '[data-qe-id="accountDropdown"]'
    ],
    searchBox: [
      'input[data-testid="search-input"]',
      'input[placeholder*="Search"]',
      '[data-qe-id="searchInput"]'
    ],
    logo: [
      'a[data-testid="logo"]',
      'a[href="/"][title*="HEB"]'
    ]
  },

  // Login Page
  login: {
    emailInput: [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]'
    ],
    passwordInput: [
      'input[type="password"]',
      'input[name="password"]',
      'input[placeholder*="password" i]'
    ],
    signInButton: [
      'button[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("Sign in")',
      '[data-testid="sign-in-button"]'
    ],
    verificationCodeInput: [
      'input[type="tel"]',
      'input[name="code"]',
      'input[placeholder*="code" i]',
      'input[placeholder*="verification" i]'
    ],
    verifyButton: [
      'button:has-text("Verify")',
      'button:has-text("Submit")',
      'button[type="submit"]'
    ],
    trustDeviceButton: [
      'button:has-text("Trust")',
      'button:has-text("Yes")',
      'label:has-text("Trust")'
    ],
    loginError: [
      '[data-testid="login-error"]',
      '.error-message',
      '[role="alert"]'
    ]
  },

  // Search Results
  search: {
    productGrid: [
      '[data-testid="product-grid"]',
      '.product-grid',
      '.search-results',
      '[data-qe-id="productGrid"]'
    ],
    productCard: [
      '[data-testid="product-card"]',
      '.product-card',
      '[data-qe-id="productCard"]'
    ],
    productTitle: [
      '[data-testid="product-title"]',
      '.product-title',
      'h3 a'
    ],
    productPrice: [
      '[data-testid="product-price"]',
      '.price',
      '[data-qe-id="price"]'
    ],
    noResults: [
      '[data-testid="no-results"]',
      'text=No results found',
      '.no-results'
    ]
  },

  // Cart Page
  cart: {
    addButton: [
      'button[data-testid*="add-to-cart" i]',
      'button[data-qe-id="addToCart"]',
      'button[data-automation-id*="add" i]',
      'button:has-text("Add to cart")',
      'button:has-text("Add")'
    ],
    itemList: [
      '[data-testid="cart-item"]',
      '.cart-item',
      '[data-qe-id="cartItem"]'
    ],
    itemCount: [
      '[data-testid="cart-count"]',
      '.cart-count',
      '[data-qe-id="cartCount"]'
    ],
    totalPrice: [
      '[data-testid="cart-total"]',
      '.cart-total',
      '.order-total',
      '[data-qe-id="cartTotal"]'
    ],
    removeItemButton: [
      'button[data-testid="remove-item"]',
      'button:has-text("Remove")',
      '.remove-button'
    ],
    clearCartButton: [
      'button:has-text("Clear Cart")',
      'button:has-text("Empty Cart")',
      '[data-testid="clear-cart"]'
    ],
    checkoutButton: [
      'button:has-text("Checkout")',
      'button[data-testid="checkout"]',
      'a[href*="/checkout"]'
    ]
  },

  // Product Page
  product: {
    title: [
      '[data-testid="product-title"]',
      'h1',
      '.product-name'
    ],
    price: [
      '[data-testid="product-price"]',
      '.price',
      '[data-qe-id="price"]'
    ],
    quantitySelector: [
      'select[data-testid="quantity"]',
      'input[name="quantity"]',
      '[data-qe-id="quantity"]'
    ],
    addToCartButton: [
      'button[data-testid="add-to-cart"]',
      'button[data-qe-id="addToCart"]',
      'button:has-text("Add to Cart")'
    ],
    inStockIndicator: [
      '[data-testid="in-stock"]',
      'text=In Stock',
      '.in-stock'
    ],
    outOfStockIndicator: [
      '[data-testid="out-of-stock"]',
      'text=Out of Stock',
      '.out-of-stock'
    ]
  }
};

// ═══════════════════════════════════════════════════════════════
// Facebook Selectors
// ═══════════════════════════════════════════════════════════════

const FB_SELECTORS = {
  // Login
  login: {
    emailInput: [
      'input[name="email"]',
      'input[type="email"]',
      '#email'
    ],
    passwordInput: [
      'input[name="pass"]',
      'input[type="password"]',
      '#pass'
    ],
    loginButton: [
      'button[name="login"]',
      'button[type="submit"]',
      '[data-testid="royal_login_button"]'
    ],
    errorMessage: [
      '[data-testid="login_error"]',
      '.errorMessage',
      '[role="alert"]'
    ]
  },

  // Navigation
  nav: {
    home: [
      '[aria-label="Home"]',
      'a[href="/"]',
      '[data-testid="left_nav_header"]'
    ],
    marketplace: [
      'a[href="/marketplace/"]',
      '[aria-label="Marketplace"]',
      'text=Marketplace'
    ],
    groups: [
      'a[href="/groups/"]',
      '[aria-label="Groups"]'
    ],
    notifications: [
      '[aria-label="Notifications"]',
      '[data-testid="notifications"]'
    ]
  },

  // Marketplace
  marketplace: {
    inbox: [
      'a[href*="/marketplace/inbox"]',
      'text=Inbox',
      '[aria-label="Marketplace inbox"]'
    ],
    selling: [
      'a[href*="/marketplace/selling"]',
      'text=Selling'
    ],
    createListing: [
      'a[href*="/marketplace/create"]',
      'text=Create new listing',
      '[aria-label="Create new listing"]'
    ],
    conversationList: [
      '[role="listitem"]',
      '[data-testid="messenger-list-item"]',
      '[data-pagelet="MWInboxList"] div[role="button"]'
    ],
    conversationItem: [
      '[role="listitem"]',
      'div[role="button"][tabindex="0"]'
    ],
    messageInput: [
      '[contenteditable="true"]',
      '[role="textbox"]',
      'div[placeholder*="message" i]'
    ],
    sendButton: [
      '[aria-label="Send"]',
      'button[type="submit"]'
    ]
  },

  // Listing
  listing: {
    shareButton: [
      '[aria-label*="Share" i]',
      'button:has-text("Share")',
      '[role="button"]:has-text("Share")'
    ],
    shareToGroup: [
      'text=Share to a group',
      'text=Group',
      '[role="menuitem"]:has-text("Group")'
    ],
    searchGroups: [
      '[placeholder*="Search"]',
      'input[type="text"]',
      '[role="combobox"]'
    ],
    postButton: [
      'text=Post',
      'button:has-text("Post")',
      '[aria-label*="Post" i]'
    ],
    listingTitle: [
      '[role="main"] h1',
      '[data-testid="listing-title"]'
    ],
    listingPrice: [
      '[data-testid="listing-price"]',
      'span:has-text("$")'
    ],
    listingDescription: [
      '[data-testid="listing-description"]',
      '[role="main"] div[dir="auto"]'
    ]
  },

  // Groups
  groups: {
    groupSearch: [
      'input[placeholder*="Search groups"]',
      'input[type="search"]'
    ],
    groupCard: [
      '[role="article"]',
      '[data-testid="group-card"]'
    ],
    joinButton: [
      'button:has-text("Join")',
      '[aria-label="Join group"]'
    ]
  }
};

// ═══════════════════════════════════════════════════════════════
// Shared/Common Selectors
// ═══════════════════════════════════════════════════════════════

const COMMON_SELECTORS = {
  // Generic form elements
  form: {
    submitButton: [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Submit")'
    ],
    cancelButton: [
      'button:has-text("Cancel")',
      '[aria-label="Cancel"]'
    ],
    textInput: [
      'input[type="text"]',
      'input:not([type])',
      'textarea'
    ]
  },

  // Loading states
  loading: {
    spinner: [
      '[role="progressbar"]',
      '.loading',
      '.spinner',
      '[data-testid="loading"]'
    ],
    skeleton: [
      '.skeleton',
      '[data-testid="skeleton"]'
    ]
  },

  // Modals/Dialogs
  modal: {
    backdrop: [
      '[role="dialog"]',
      '[data-testid="modal-backdrop"]',
      '.modal-overlay'
    ],
    closeButton: [
      '[aria-label="Close"]',
      'button:has-text("Close")',
      '.modal-close'
    ],
    confirmButton: [
      'button:has-text("OK")',
      'button:has-text("Confirm")',
      'button:has-text("Yes")'
    ]
  }
};

// ═══════════════════════════════════════════════════════════════
// Selector Utilities
// ═══════════════════════════════════════════════════════════════

/**
 * Flatten a selector chain into a single array
 * @param {Object} selectorSet - Nested selector object
 * @returns {string[]} Flat array of all selectors
 * 
 * @example
 * const allSelectors = flattenSelectors(HEB_SELECTORS.login);
 * // Returns: ['input[type="email"]', 'input[name="email"]', ...]
 */
function flattenSelectors(selectorSet) {
  const result = [];
  
  function traverse(obj) {
    for (const key in obj) {
      const value = obj[key];
      if (Array.isArray(value)) {
        result.push(...value);
      } else if (typeof value === 'object' && value !== null) {
        traverse(value);
      }
    }
  }
  
  traverse(selectorSet);
  return [...new Set(result)]; // Remove duplicates
}

/**
 * Get a specific selector chain by path
 * @param {Object} selectorSet - Selector set (HEB_SELECTORS, FB_SELECTORS, etc.)
 * @param {string} path - Dot-notation path (e.g., 'cart.addButton')
 * @returns {string[]|null} Selector array or null if not found
 * 
 * @example
 * const selectors = getSelectorByPath(HEB_SELECTORS, 'cart.addButton');
 */
function getSelectorByPath(selectorSet, path) {
  const keys = path.split('.');
  let current = selectorSet;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return null;
    }
  }
  
  return Array.isArray(current) ? current : null;
}

/**
 * Merge custom selectors with defaults
 * @param {Object} defaults - Default selectors
 * @param {Object} custom - Custom selectors to merge
 * @returns {Object} Merged selectors
 */
function mergeSelectors(defaults, custom) {
  const result = { ...defaults };
  
  for (const key in custom) {
    if (key in result && Array.isArray(result[key]) && Array.isArray(custom[key])) {
      // Prepend custom selectors to defaults
      result[key] = [...custom[key], ...result[key]];
    } else if (key in result && typeof result[key] === 'object') {
      // Recursively merge nested objects
      result[key] = mergeSelectors(result[key], custom[key]);
    } else {
      // Add new key
      result[key] = custom[key];
    }
  }
  
  return result;
}

/**
 * Validate that all selectors in a set are strings
 * @param {Object} selectorSet - Selector set to validate
 * @returns {boolean} True if valid
 */
function validateSelectors(selectorSet) {
  function check(obj, path = '') {
    for (const key in obj) {
      const value = obj[key];
      const currentPath = path ? `${path}.${key}` : key;
      
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] !== 'string') {
            console.error(`Invalid selector at ${currentPath}[${i}]: expected string, got ${typeof value[i]}`);
            return false;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        if (!check(value, currentPath)) return false;
      }
    }
    return true;
  }
  
  return check(selectorSet);
}

module.exports = {
  HEB_SELECTORS,
  FB_SELECTORS,
  COMMON_SELECTORS,
  
  // Utilities
  flattenSelectors,
  getSelectorByPath,
  mergeSelectors,
  validateSelectors
};
