from playwright.sync_api import sync_playwright
import time

# Credentials
email = "alex@xspqr.com"
password = "section9"

# Listing URL
listing_url = "https://www.facebook.com/marketplace/item/2269858303434147/"

# Share message
share_message = """2018 Ford F-150 STX 2.7L EcoBoost - $26,500 OBO. 110,584 miles, automatic, black on black, clean title, well-maintained in Buda, TX. Message me for details!"""

# Group to share to
group_name = "Austin Buy Sell Trade"

def main():
    with sync_playwright() as p:
        # Launch browser with persistent context (using openclaw profile data)
        context = p.chromium.launch_persistent_context(
            user_data_dir=r"C:\Users\Admin\.openclaw\browser\openclaw\user-data",
            headless=False,
            args=['--disable-blink-features=AutomationControlled']
        )
        
        page = context.new_page()
        
        print("Navigating to Facebook Marketplace listing...")
        page.goto(listing_url, wait_until='domcontentloaded')
        
        # Wait a bit for the page to fully render
        time.sleep(5)
        
        # Check if we need to log in
        if "login" in page.url or page.locator('input[name="email"]').is_visible():
            print("Need to log in. Logging in...")
            page.goto("https://www.facebook.com/login", wait_until='domcontentloaded')
            
            # Fill in login credentials
            page.fill('input[name="email"]', email)
            page.fill('input[name="pass"]', password)
            
            # Click login button
            page.click('button[name="login"]')
            
            # Wait for login to complete
            page.wait_for_load_state('networkidle')
            time.sleep(3)
            
            print("Logged in successfully!")
            
            # Navigate back to the listing
            print("Navigating back to listing...")
            page.goto(listing_url, wait_until='domcontentloaded')
            time.sleep(5)
        
        print("Looking for Share button...")
        
        # Take a screenshot to debug
        page.screenshot(path="facebook_listing.png")
        print("Screenshot saved as facebook_listing.png")
        
        # Look for Share button - try different selectors
        share_button = None
        selectors = [
            'text=Share',
            '[aria-label="Share"]',
            'button:has-text("Share")',
            'div[role="button"]:has-text("Share")'
        ]
        
        for selector in selectors:
            try:
                if page.locator(selector).first.is_visible():
                    share_button = page.locator(selector).first
                    print(f"Found Share button with selector: {selector}")
                    break
            except:
                continue
        
        if not share_button:
            print("Could not find Share button. Checking page content...")
            print(f"Current URL: {page.url}")
            print(f"Page title: {page.title()}")
            context.close()
            return False
        
        # Click Share button
        print("Clicking Share button...")
        share_button.click()
        time.sleep(2)
        
        # Look for "Share to a group" option
        print("Looking for 'Share to a group' option...")
        group_option = page.locator('text=Share to a group').first
        if group_option.is_visible():
            print("Found 'Share to a group' option. Clicking...")
            group_option.click()
            time.sleep(2)
        else:
            print("Could not find 'Share to a group' option")
            context.close()
            return False
        
        # Search for the group
        print(f"Searching for group: {group_name}...")
        search_box = page.locator('input[placeholder*="Search"], input[aria-label*="Search"]').first
        if search_box.is_visible():
            search_box.fill(group_name)
            time.sleep(2)
        
        # Click on the group
        print(f"Selecting group: {group_name}...")
        group_selector = f'text={group_name}'
        group_element = page.locator(group_selector).first
        if group_element.is_visible():
            group_element.click()
            time.sleep(2)
        else:
            print(f"Could not find group: {group_name}")
            context.close()
            return False
        
        # Fill in the share message
        print("Filling in share message...")
        message_box = page.locator('textarea, div[contenteditable="true"]').first
        if message_box.is_visible():
            message_box.fill(share_message)
            time.sleep(1)
        
        # Click Post button
        print("Clicking Post button...")
        post_button = page.locator('text=Post').first
        if post_button.is_visible():
            post_button.click()
            time.sleep(3)
            print("Post shared successfully!")
        else:
            print("Could not find Post button")
            context.close()
            return False
        
        # Take a final screenshot
        page.screenshot(path="facebook_shared.png")
        print("Final screenshot saved as facebook_shared.png")
        
        context.close()
        return True

if __name__ == "__main__":
    success = main()
    if success:
        print("\n✅ Successfully shared the F-150 listing to Austin Buy Sell Trade group!")
    else:
        print("\n❌ Failed to share the listing")
