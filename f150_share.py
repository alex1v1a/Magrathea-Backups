from playwright.sync_api import sync_playwright
import time

FB_EMAIL = 'alex@xspqr.com'
FB_PASS = 'section9'
LISTING_URL = 'https://www.facebook.com/marketplace/item/2269858303434147/'
GROUP_NAME = 'Austin Cars & Trucks - For Sale'
POST_TEXT = '2018 Ford F-150 STX 2.7L EcoBoost - $26,500 OBO. 110,584 miles, automatic, black on black, clean title, well-maintained in Buda, TX. Message me for details!'

screenshot_dir = r'C:\Users\Admin\.openclaw\workspace'

def main():
    with sync_playwright() as p:
        print("Launching Chrome with openclaw profile...")
        
        browser = p.chromium.launch_persistent_context(
            user_data_dir=r'C:\Users\Admin\.openclaw\browser\openclaw\user-data',
            executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',
            headless=False,
            viewport={'width': 1280, 'height': 800},
            args=['--no-sandbox']
        )
        
        page = browser.new_page()
        
        try:
            # Navigate to Facebook
            print("Navigating to Facebook...")
            page.goto('https://www.facebook.com', wait_until='networkidle', timeout=60000)
            time.sleep(3)
            
            # Check if already logged in
            is_logged_in = False
            try:
                page.locator('[aria-label="Home"]').first.wait_for(timeout=5000)
                is_logged_in = True
            except:
                try:
                    page.locator('[aria-label="Your profile"]').first.wait_for(timeout=3000)
                    is_logged_in = True
                except:
                    pass
            
            if not is_logged_in:
                print("Not logged in. Logging in...")
                page.fill('input[name="email"], input#email', FB_EMAIL)
                page.fill('input[name="pass"], input#pass', FB_PASS)
                page.click('button[name="login"], button[data-testid="royal_login_button"]')
                time.sleep(8)
                
                # Handle save login prompt
                try:
                    save_btn = page.locator('button:has-text("Save"), button:has-text("Continue"), button:has-text("OK")').first
                    if save_btn.is_visible(timeout=3000):
                        save_btn.click()
                        time.sleep(2)
                except:
                    pass
                print("Login completed")
            else:
                print("Already logged in")
            
            # Navigate to listing
            print("Navigating to F-150 listing...")
            page.goto(LISTING_URL, wait_until='networkidle', timeout=60000)
            time.sleep(5)
            
            page.screenshot(path=f'{screenshot_dir}\\f150_listing.png')
            print("Listing screenshot saved")
            
            # Find and click share button
            print("Looking for share button...")
            share_btn = None
            for selector in ['text=/Share/i', 'button[aria-label*="Share"]', '[role="button"]:has-text("Share")']:
                try:
                    btn = page.locator(selector).first
                    if btn.is_visible(timeout=3000):
                        share_btn = btn
                        print(f"Found share button with: {selector}")
                        break
                except:
                    continue
            
            if not share_btn:
                print("Scrolling to find share button...")
                page.evaluate('window.scrollTo(0, 500)')
                time.sleep(2)
                for selector in ['text=/Share/i', 'button[aria-label*="Share"]']:
                    try:
                        btn = page.locator(selector).first
                        if btn.is_visible(timeout=3000):
                            share_btn = btn
                            break
                    except:
                        continue
            
            if share_btn:
                share_btn.click()
                print("Clicked share button")
                time.sleep(3)
            else:
                raise Exception("Could not find share button")
            
            # Look for "Share to a group" option
            print("Looking for 'Share to a group' option...")
            for selector in ['text=/Share to a group/i', 'text=/Share in a group/i', 'text=/group/i']:
                try:
                    option = page.locator(selector).first
                    if option.is_visible(timeout=3000):
                        print(f"Found option: {selector}")
                        option.click()
                        time.sleep(3)
                        break
                except:
                    continue
            
            # Search for group
            print(f"Searching for group: {GROUP_NAME}...")
            try:
                search = page.locator('input[placeholder*="Search"], input[aria-label*="Search"]').first
                if search.is_visible(timeout=3000):
                    search.fill(GROUP_NAME)
                    time.sleep(3)
            except:
                pass
            
            # Select group
            print("Selecting group...")
            group_selected = False
            for selector in [f'text="{GROUP_NAME}"', '[role="listitem"]', '[role="option"]']:
                try:
                    group = page.locator(selector).first
                    if group.is_visible(timeout=3000):
                        text = group.text_content()
                        print(f"Found: {text}")
                        group.click()
                        group_selected = True
                        time.sleep(3)
                        break
                except:
                    continue
            
            if not group_selected:
                print("Group not found, taking screenshot...")
                page.screenshot(path=f'{screenshot_dir}\\f150_group_select.png')
            
            # Add post text
            print("Adding post text...")
            for selector in ['textarea', 'div[contenteditable="true"]', '[role="textbox"]']:
                try:
                    text_area = page.locator(selector).first
                    if text_area.is_visible(timeout=3000):
                        text_area.fill(POST_TEXT)
                        print("Post text added")
                        time.sleep(2)
                        break
                except:
                    continue
            
            # Click Post/Share
            print("Clicking Post button...")
            for selector in ['button:has-text("Post")', 'button:has-text("Share")', '[aria-label="Post"]', '[aria-label="Share now"]']:
                try:
                    post_btn = page.locator(selector).first
                    if post_btn.is_visible(timeout=3000):
                        btn_text = post_btn.text_content()
                        print(f"Clicking: {btn_text}")
                        post_btn.click()
                        time.sleep(5)
                        
                        page.screenshot(path=f'{screenshot_dir}\\f150_share_result.png')
                        print("SUCCESS: F-150 listing shared!")
                        break
                except Exception as e:
                    print(f"Error clicking button: {e}")
                    continue
            
            time.sleep(3)
            
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path=f'{screenshot_dir}\\f150_share_error.png')
        finally:
            browser.close()
            print("Browser closed")

if __name__ == '__main__':
    main()
