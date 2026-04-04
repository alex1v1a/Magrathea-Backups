from playwright.sync_api import sync_playwright
import time

def share_f150_listing():
    with sync_playwright() as p:
        # Launch Chrome browser
        print("Launching Chrome browser...")
        browser = p.chromium.launch(
            headless=False,
            args=['--disable-blink-features=AutomationControlled']
        )
        
        # Create a new browser context
        context = browser.new_context(
            viewport={'width': 1280, 'height': 800}
        )
        
        # Create a new page
        page = context.new_page()
        
        try:
            # Step 1: Navigate to Facebook login
            print("Navigating to Facebook login...")
            page.goto("https://facebook.com/login", wait_until="networkidle")
            time.sleep(2)
            page.screenshot(path="screenshot_01_login_page.png")
            
            # Step 2: Log in
            print("Logging in...")
            page.fill('input[name="email"]', "alex@xspqr.com")
            page.fill('input[name="pass"]', "section9")
            page.click('button[name="login"]')
            
            # Wait for login to complete
            page.wait_for_load_state("networkidle")
            time.sleep(5)
            page.screenshot(path="screenshot_02_after_login.png")
            print("Login completed")
            
            # Step 3: Navigate to F-150 listing
            print("Navigating to F-150 listing...")
            page.goto("https://www.facebook.com/marketplace/item/2269858303434147/", wait_until="networkidle")
            time.sleep(3)
            page.screenshot(path="screenshot_03_listing_page.png")
            print("Listing page loaded")
            
            # Step 4: Click Share button
            print("Clicking Share button...")
            # Try different selectors for the Share button
            share_selectors = [
                'text=Share',
                '[aria-label="Share"]',
                'div[role="button"]:has-text("Share")',
            ]
            
            share_clicked = False
            for selector in share_selectors:
                try:
                    page.click(selector, timeout=5000)
                    share_clicked = True
                    print(f"Share button clicked using selector: {selector}")
                    break
                except:
                    continue
            
            if not share_clicked:
                print("Could not find Share button")
                page.screenshot(path="screenshot_error_no_share.png")
                return False
            
            time.sleep(2)
            page.screenshot(path="screenshot_04_share_menu.png")
            
            # Step 5: Select "Share to a group"
            print("Selecting 'Share to a group'...")
            group_selectors = [
                'text=Share to a group',
                '[aria-label="Share to a group"]',
                'div[role="button"]:has-text("Share to a group")',
            ]
            
            group_clicked = False
            for selector in group_selectors:
                try:
                    page.click(selector, timeout=5000)
                    group_clicked = True
                    print(f"'Share to a group' clicked using selector: {selector}")
                    break
                except:
                    continue
            
            if not group_clicked:
                print("Could not find 'Share to a group' option")
                page.screenshot(path="screenshot_error_no_group.png")
                return False
            
            time.sleep(2)
            page.screenshot(path="screenshot_05_group_search.png")
            
            # Step 6: Search for "Austin Buy Sell Trade"
            print("Searching for 'Austin Buy Sell Trade'...")
            search_selectors = [
                'input[placeholder*="Search"]',
                'input[aria-label*="Search"]',
                '[role="dialog"] input',
            ]
            
            search_filled = False
            for selector in search_selectors:
                try:
                    page.fill(selector, "Austin Buy Sell Trade", timeout=5000)
                    search_filled = True
                    print(f"Search filled using selector: {selector}")
                    break
                except:
                    continue
            
            if not search_filled:
                print("Could not find search input")
                page.screenshot(path="screenshot_error_no_search.png")
                return False
            
            time.sleep(2)
            page.screenshot(path="screenshot_06_search_results.png")
            
            # Step 7: Select the group
            print("Selecting the group...")
            group_option_selectors = [
                'text=Austin Buy Sell Trade',
                '[role="radio"]:has-text("Austin Buy Sell Trade")',
                'div[role="button"]:has-text("Austin Buy Sell Trade")',
            ]
            
            group_selected = False
            for selector in group_option_selectors:
                try:
                    page.click(selector, timeout=5000)
                    group_selected = True
                    print(f"Group selected using selector: {selector}")
                    break
                except:
                    continue
            
            if not group_selected:
                print("Could not find 'Austin Buy Sell Trade' group")
                page.screenshot(path="screenshot_error_no_group_found.png")
                return False
            
            time.sleep(2)
            page.screenshot(path="screenshot_07_group_selected.png")
            
            # Step 8: Fill in the post text
            print("Filling post text...")
            post_text = "2018 Ford F-150 STX 2.7L EcoBoost - $26,500 OBO. 110,584 miles, automatic, black on black, clean title, well-maintained in Buda, TX. Message me for details!"
            
            text_selectors = [
                'textarea[aria-label*="Write"]',
                'textarea[placeholder*="Write"]',
                '[contenteditable="true"]',
                '[role="textbox"]',
            ]
            
            text_filled = False
            for selector in text_selectors:
                try:
                    page.fill(selector, post_text, timeout=5000)
                    text_filled = True
                    print(f"Text filled using selector: {selector}")
                    break
                except:
                    continue
            
            if not text_filled:
                print("Could not find text input")
                page.screenshot(path="screenshot_error_no_text.png")
                return False
            
            time.sleep(2)
            page.screenshot(path="screenshot_08_text_filled.png")
            
            # Step 9: Post
            print("Clicking Post button...")
            post_selectors = [
                'text=Post',
                '[aria-label="Post"]',
                'div[role="button"]:has-text("Post")',
            ]
            
            post_clicked = False
            for selector in post_selectors:
                try:
                    page.click(selector, timeout=5000)
                    post_clicked = True
                    print(f"Post button clicked using selector: {selector}")
                    break
                except:
                    continue
            
            if not post_clicked:
                print("Could not find Post button")
                page.screenshot(path="screenshot_error_no_post.png")
                return False
            
            time.sleep(3)
            page.screenshot(path="screenshot_09_posted.png")
            print("Post shared successfully!")
            
            return True
            
        except Exception as e:
            print(f"Error occurred: {e}")
            page.screenshot(path="screenshot_error.png")
            return False
        finally:
            # Keep browser open for a bit to see the result
            time.sleep(5)
            browser.close()

if __name__ == "__main__":
    success = share_f150_listing()
    if success:
        print("\n=== TASK COMPLETED SUCCESSFULLY ===")
    else:
        print("\n=== TASK FAILED ===")
