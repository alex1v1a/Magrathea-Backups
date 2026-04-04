# HEB Selenium Bot with Undetected ChromeDriver
# pip install undetected-chromedriver selenium

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
import time
import json
import random


class HEBSeleniumBot:
    """HEB automation using undetected-chromedriver to bypass bot detection"""
    
    def __init__(self, profile_dir=r"C:\temp\heb_selenium_profile"):
        self.driver = None
        self.wait = None
        self.profile_dir = profile_dir
        self.base_url = "https://www.heb.com"
        
    def start(self, headless=False):
        """Initialize undetected Chrome with evasion settings"""
        print("🚀 Starting undetected Chrome...")
        
        options = uc.ChromeOptions()
        
        # Profile settings (maintains login)
        options.user_data_dir = self.profile_dir
        
        # Evasion options
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_argument('--disable-web-security')
        options.add_argument('--disable-features=IsolateOrigins,site-per-process')
        options.add_argument('--disable-site-isolation-trials')
        
        if headless:
            # Note: Some sites detect headless even with stealth
            options.add_argument('--headless=new')
        
        # Random window size
        width = random.choice([1366, 1440, 1536, 1920])
        height = random.choice([768, 900, 864, 1080])
        options.add_argument(f'--window-size={width},{height}')
        
        # Create driver
        self.driver = uc.Chrome(options=options, version_main=None)
        self.wait = WebDriverWait(self.driver, 20)
        
        # Apply additional evasions
        self._apply_evasions()
        
        print(f"✅ Chrome started ({width}x{height})")
        
    def _apply_evasions(self):
        """Apply JavaScript evasions"""
        # Remove webdriver property
        self.driver.execute_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    {name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer'},
                    {name: 'Native Client', filename: 'native_client.nmf'},
                    {name: 'Widevine Content Decryption Module', filename: 'widevinecdmadapter.dll'}
                ]
            });
            
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
            
            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' 
                    ? Promise.resolve({ state: Notification.permission })
                    : originalQuery(parameters)
            );
        """)
        
    def navigate(self, path=""):
        """Navigate to HEB page"""
        url = f"{self.base_url}/{path}" if path else self.base_url
        self.driver.get(url)
        self._random_wait(2, 4)
        
    def search_and_add(self, term, quantity=1):
        """Search for product and add first result to cart"""
        print(f"🔍 Searching for: {term}")
        
        try:
            # Navigate to search
            search_url = f"{self.base_url}/search?q={term.replace(' ', '+')}"
            self.driver.get(search_url)
            self._random_wait(3, 6)
            
            # Wait for results with multiple selectors
            selectors = [
                '[data-testid*="product"]',
                '.product-grid',
                'article[data-product-id]',
                '[class*="product-card"]'
            ]
            
            add_button = None
            for selector in selectors:
                try:
                    add_button = self.wait.until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, f'{selector} button'))
                    )
                    break
                except:
                    continue
                    
            if not add_button:
                # Try generic add button
                add_button = self.wait.until(
                    EC.element_to_be_clickable((By.XPATH, 
                        "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'add')]"
                    ))
                )
            
            # Human-like interaction
            self._human_like_click(add_button)
            
            # Wait for add to complete
            self._random_wait(2, 3)
            
            print(f"✅ Added: {term}")
            return {'success': True, 'term': term}
            
        except Exception as e:
            print(f"❌ Failed to add {term}: {e}")
            return {'success': False, 'term': term, 'error': str(e)}
            
    def _human_like_click(self, element):
        """Perform human-like click with movement"""
        # Scroll into view
        self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", element)
        self._random_wait(0.5, 1)
        
        # Move mouse to element with slight offset
        actions = ActionChains(self.driver)
        actions.move_to_element_with_offset(
            element, 
            random.randint(-5, 5), 
            random.randint(-5, 5)
        )
        actions.pause(random.uniform(0.2, 0.5))
        actions.click()
        actions.perform()
        
    def get_cart_items(self):
        """Get current cart contents"""
        print("🛍️ Getting cart items...")
        
        self.navigate("cart")
        self._random_wait(3, 5)
        
        items = []
        try:
            # Wait for cart items
            self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 
                '.cart-items, [data-testid="cart-items"], .cart-page, [class*="cart-item"]'
            )))
            
            # Extract items
            item_elements = self.driver.find_elements(By.CSS_SELECTOR, 
                '.cart-item, [data-testid="cart-item"], [class*="cart-item"]'
            )
            
            for el in item_elements:
                try:
                    name = el.find_element(By.CSS_SELECTOR, 
                        '.product-name, h3, [data-testid*="name"]'
                    ).text
                    
                    price = el.find_element(By.CSS_SELECTOR, 
                        '.price, [data-testid*="price"]'
                    ).text
                    
                    items.append({'name': name, 'price': price})
                except:
                    pass
                    
        except Exception as e:
            print(f"Warning: Could not get cart items: {e}")
            
        return items
        
    def sync_cart(self, meal_plan_items, clear_first=False):
        """Sync meal plan to HEB cart"""
        print(f"🔄 Syncing {len(meal_plan_items)} items...")
        
        results = {'added': [], 'failed': []}
        
        for item in meal_plan_items:
            search_term = item.get('searchTerm') or item.get('name')
            print(f"➕ Adding: {search_term}")
            
            result = self.search_and_add(search_term, item.get('quantity', 1))
            
            if result['success']:
                results['added'].append(search_term)
            else:
                results['failed'].append({'name': search_term, 'error': result.get('error')})
            
            # Random delay between items
            self._random_wait(2, 4)
            
        return results
        
    def _random_wait(self, min_sec, max_sec):
        """Wait for random duration to mimic human behavior"""
        wait_time = random.uniform(min_sec, max_sec)
        time.sleep(wait_time)
        
    def close(self):
        """Clean up"""
        if self.driver:
            print("👋 Closing browser...")
            self.driver.quit()


def load_meal_plan(path='meal_plan.json'):
    """Load meal plan from JSON file"""
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        # Default meal plan for testing
        return {
            'items': [
                {'name': 'milk', 'searchTerm': 'whole milk', 'quantity': 1},
                {'name': 'eggs', 'searchTerm': 'large eggs', 'quantity': 1},
                {'name': 'bread', 'searchTerm': 'sandwich bread', 'quantity': 1}
            ]
        }


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='HEB Cart Automation')
    parser.add_argument('--meal-plan', default='meal_plan.json', help='Path to meal plan JSON')
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    parser.add_argument('--test', action='store_true', help='Run quick test only')
    args = parser.parse_args()
    
    bot = HEBSeleniumBot()
    
    try:
        bot.start(headless=args.headless)
        
        if args.test:
            # Quick test
            print("\n🧪 Running quick test...")
            bot.navigate()
            print(f"Page title: {bot.driver.title}")
            
            # Try to add one item
            result = bot.search_and_add('milk')
            print(f"Test result: {result}")
            
        else:
            # Full sync
            meal_plan = load_meal_plan(args.meal_plan)
            print(f"\n📋 Loaded {len(meal_plan.get('items', []))} items from meal plan")
            
            results = bot.sync_cart(meal_plan.get('items', []))
            
            print("\n📊 Results:")
            print(f"  Added: {len(results['added'])}")
            print(f"  Failed: {len(results['failed'])}")
            
            if results['failed']:
                print("\n❌ Failed items:")
                for item in results['failed']:
                    print(f"  - {item['name']}: {item['error']}")
            
            # Show final cart
            cart = bot.get_cart_items()
            print(f"\n🛒 Cart now has {len(cart)} items")
            
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user")
    finally:
        bot.close()


if __name__ == '__main__':
    main()
