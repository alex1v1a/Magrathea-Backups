/**
 * Visual Regression Fixtures
 * HTML snapshots for visual regression testing
 */

// HEB Homepage mock
export const hebHomepage = `
<!DOCTYPE html>
<html>
<head>
  <title>HEB Texas Grocery Store</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
    header { background: #d91e18; color: white; padding: 1rem; }
    .search-box { 
      width: 300px; 
      padding: 10px; 
      border: 1px solid #ccc; 
      border-radius: 4px;
    }
    .product-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      padding: 20px;
    }
    .product-card {
      border: 1px solid #eee;
      padding: 15px;
      border-radius: 8px;
    }
    .add-button {
      background: #d91e18;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
    }
    .cart-count {
      background: white;
      color: #d91e18;
      border-radius: 50%;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <header>
    <h1>HEB</h1>
    <input type="search" class="search-box" data-testid="search-input" placeholder="Search products..." />
    <div class="cart-icon" data-testid="cart-count">0</div>
  </header>
  <main>
    <div class="product-grid">
      <div class="product-card">
        <h3>Organic Milk</h3>
        <p>$3.99</p>
        <button class="add-button" data-testid="add-to-cart" data-sku="123">Add</button>
      </div>
      <div class="product-card">
        <h3>Large Eggs</h3>
        <p>$2.49</p>
        <button class="add-button" data-testid="add-to-cart" data-sku="124">Add</button>
      </div>
      <div class="product-card">
        <h3>White Bread</h3>
        <p>$1.99</p>
        <button class="add-button" data-testid="add-to-cart" data-sku="125">Add</button>
      </div>
    </div>
  </main>
</body>
</html>
`;

// HEB Search Results mock
export const hebSearchResults = `
<!DOCTYPE html>
<html>
<head>
  <title>Search Results - HEB</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
    header { background: #d91e18; color: white; padding: 1rem; }
    .results { padding: 20px; }
    .product-list { display: flex; flex-direction: column; gap: 15px; }
    .product-item {
      display: flex;
      align-items: center;
      gap: 20px;
      border: 1px solid #eee;
      padding: 15px;
      border-radius: 8px;
    }
    .product-image {
      width: 100px;
      height: 100px;
      background: #f5f5f5;
      border-radius: 4px;
    }
    .add-button {
      background: #d91e18;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin-left: auto;
    }
    .out-of-stock {
      color: #999;
      font-style: italic;
    }
  </style>
</head>
<body>
  <header>
    <h1>HEB - Search Results</h1>
  </header>
  <div class="results">
    <h2>Results for "milk"</h2>
    <div class="product-list">
      <div class="product-item">
        <div class="product-image"></div>
        <div>
          <h3>Whole Milk 1 Gallon</h3>
          <p>$3.99</p>
        </div>
        <button class="add-button" data-testid="add-to-cart" data-sku="200">Add to Cart</button>
      </div>
      <div class="product-item">
        <div class="product-image"></div>
        <div>
          <h3>2% Reduced Fat Milk</h3>
          <p>$3.79</p>
        </div>
        <button class="add-button" data-testid="add-to-cart" data-sku="201">Add to Cart</button>
      </div>
      <div class="product-item">
        <div class="product-image"></div>
        <div>
          <h3>Organic Milk</h3>
          <p>$4.99</p>
          <span class="out-of-stock">Out of Stock</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

// HEB Cart Page mock
export const hebCartPage = `
<!DOCTYPE html>
<html>
<head>
  <title>Cart - HEB</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
    header { background: #d91e18; color: white; padding: 1rem; }
    .cart-container { padding: 20px; max-width: 800px; margin: 0 auto; }
    .cart-item {
      display: flex;
      align-items: center;
      gap: 20px;
      border-bottom: 1px solid #eee;
      padding: 15px 0;
    }
    .cart-item-name { flex: 1; }
    .quantity-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .qty-btn {
      width: 30px;
      height: 30px;
      border: 1px solid #ccc;
      background: white;
      cursor: pointer;
    }
    .cart-summary {
      margin-top: 20px;
      padding: 20px;
      background: #f9f9f9;
      border-radius: 8px;
    }
    .checkout-btn {
      background: #d91e18;
      color: white;
      border: none;
      padding: 15px 40px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      width: 100%;
    }
  </style>
</head>
<body>
  <header>
    <h1>HEB - Shopping Cart</h1>
  </header>
  <div class="cart-container">
    <h2>Your Cart (3 items)</h2>
    <div class="cart-items">
      <div class="cart-item" data-testid="cart-item" data-sku="123">
        <div class="cart-item-name">Organic Milk</div>
        <div class="quantity-controls">
          <button class="qty-btn">-</button>
          <span>1</span>
          <button class="qty-btn">+</button>
        </div>
        <div class="cart-item-price">$3.99</div>
      </div>
      <div class="cart-item" data-testid="cart-item" data-sku="124">
        <div class="cart-item-name">Large Eggs</div>
        <div class="quantity-controls">
          <button class="qty-btn">-</button>
          <span>1</span>
          <button class="qty-btn">+</button>
        </div>
        <div class="cart-item-price">$2.49</div>
      </div>
      <div class="cart-item" data-testid="cart-item" data-sku="125">
        <div class="cart-item-name">White Bread</div>
        <div class="quantity-controls">
          <button class="qty-btn">-</button>
          <span>1</span>
          <button class="qty-btn">+</button>
        </div>
        <div class="cart-item-price">$1.99</div>
      </div>
    </div>
    <div class="cart-summary">
      <div>Subtotal: <strong>$8.47</strong></div>
      <div>Tax: <strong>$0.70</strong></div>
      <div>Total: <strong>$9.17</strong></div>
      <button class="checkout-btn">Proceed to Checkout</button>
    </div>
  </div>
</body>
</html>
`;

// CAPTCHA challenge page mock
export const captchaPage = `
<!DOCTYPE html>
<html>
<head>
  <title>Security Check</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .captcha-container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      text-align: center;
    }
    #captcha {
      margin: 20px 0;
      padding: 20px;
      border: 1px solid #ddd;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div class="captcha-container">
    <h1>Security Check</h1>
    <p>Please complete the CAPTCHA to continue</p>
    <div id="captcha">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='50'%3E%3Crect fill='%23eee' width='200' height='50'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3ECAPTCHA MOCK%3C/text%3E%3C/svg%3E" alt="CAPTCHA" />
    </div>
    <button>Verify</button>
  </div>
</body>
</html>
`;

// Error page mock
export const errorPage = `
<!DOCTYPE html>
<html>
<head>
  <title>Error - HEB</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .error-container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      text-align: center;
      max-width: 500px;
    }
    .error-icon {
      font-size: 48px;
      color: #d91e18;
    }
    h1 { color: #333; }
    .error-message { color: #666; margin: 20px 0; }
    .retry-btn {
      background: #d91e18;
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-icon">⚠️</div>
    <h1>Oops! Something went wrong</h1>
    <p class="error-message">
      We apologize for the inconvenience. Please try again later.
    </p>
    <button class="retry-btn">Try Again</button>
  </div>
</body>
</html>
`;

// Export all fixtures
export default {
  hebHomepage,
  hebSearchResults,
  hebCartPage,
  captchaPage,
  errorPage
};
