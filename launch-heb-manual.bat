@echo off
echo ==========================================
echo    HEB Shopping - Chrome Manual Launch
echo ==========================================
echo.
echo Shopping List (31 items):
echo.
echo 1. White fish fillets (tilapia)
echo 2. Corn tortillas  
echo 3. Mango
echo 4. Red onion
echo 5. Jalapeno
echo 6. Cabbage slaw mix
echo 7. Chipotle mayo
echo 8. Cod fillets
echo 9. Unsalted butter
echo 10. Fresh parsley
echo 11. Capers
echo 12. White wine (cooking)
echo 13. Green beans
echo 14. Chicken thighs
echo 15. Lemon
echo 16. Fresh thyme
echo 17. Oregano
echo 18. Couscous
echo 19. Zucchini
echo 20. Ribeye steak
echo 21. Asian pear
echo 22. Gochujang
echo 23. Jasmine rice
echo 24. Sesame seeds
echo 25. Kimchi
echo 26. Chicken breast
echo 27. Cucumber
echo 28. Cherry tomatoes
echo 29. Feta cheese
echo 30. Quinoa
echo 31. Hummus
echo.
echo Press any key to open Chrome with HEB...
pause > nul

"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --user-data-dir="C:\Users\Admin\AppData\Local\Google\Chrome\User Data" ^
  --start-maximized ^
  https://www.heb.com

echo.
echo Chrome opened! Log in to HEB and add items from the list above.
echo.
pause
