// HEB Cart Helper - Bookmarklet Version
// Drag this to your bookmarks bar, then click it on heb.com

javascript:(function(){
  const items = [
    {name: "Pork tenderloin", search: "pork tenderloin", qty: "1.5 lbs"},
    {name: "Brussels sprouts", search: "brussels sprouts", qty: "1.5 lbs"},
    {name: "Sweet potatoes", search: "sweet potatoes", qty: "2 lbs"},
    {name: "Dijon mustard", search: "dijon mustard", qty: "1 jar"},
    {name: "Fresh rosemary", search: "rosemary fresh", qty: "1 bunch"},
    {name: "Balsamic vinegar", search: "balsamic vinegar", qty: "1 bottle"},
    {name: "Ground turkey", search: "ground turkey", qty: "1.5 lbs"},
    {name: "Bell peppers", search: "bell peppers large", qty: "6"},
    {name: "Quinoa", search: "quinoa", qty: "1 lb"},
    {name: "Black beans", search: "black beans", qty: "1 can"},
    {name: "Diced tomatoes", search: "diced tomatoes", qty: "1 can"},
    {name: "Shredded cheese", search: "cheese shredded mexican", qty: "8 oz"},
    {name: "Chickpeas", search: "chickpeas", qty: "2 cans"},
    {name: "Coconut milk", search: "coconut milk", qty: "2 cans"},
    {name: "Spinach", search: "spinach fresh", qty: "10 oz"},
    {name: "Curry paste", search: "curry paste", qty: "1 jar"},
    {name: "Naan bread", search: "naan bread", qty: "1 pack"},
    {name: "Yellow onion", search: "yellow onion", qty: "1"},
    {name: "Chicken thighs", search: "chicken thighs boneless", qty: "2 lbs"},
    {name: "Greek yogurt", search: "greek yogurt plain", qty: "16 oz"},
    {name: "Heavy cream", search: "heavy cream", qty: "1 pint"},
    {name: "Basmati rice", search: "basmati rice", qty: "2 lbs"},
    {name: "Tikka masala sauce", search: "tikka masala sauce", qty: "1 jar"},
    {name: "Fresh ginger", search: "ginger root", qty: "1 piece"},
    {name: "Lemon", search: "lemon", qty: "3"},
    {name: "Fresh thyme", search: "thyme fresh", qty: "1 bunch"},
    {name: "Oregano", search: "oregano dried", qty: "1 container"},
    {name: "Couscous", search: "couscous", qty: "1 lb"},
    {name: "Zucchini", search: "zucchini", qty: "3"},
    {name: "White fish fillets", search: "tilapia fillet", qty: "1.5 lbs"},
    {name: "Corn tortillas", search: "corn tortillas", qty: "1 pack"},
    {name: "Mango", search: "mango", qty: "2"},
    {name: "Red onion", search: "red onion", qty: "1"},
    {name: "Jalapeno", search: "jalapeno", qty: "2"},
    {name: "Cabbage slaw mix", search: "coleslaw mix", qty: "1 bag"},
    {name: "Chipotle mayo", search: "chipotle mayo", qty: "1 bottle"},
    {name: "Chicken breast", search: "chicken breast boneless", qty: "2 lbs"},
    {name: "Cucumber", search: "cucumber", qty: "2"},
    {name: "Cherry tomatoes", search: "tomatoes cherry", qty: "1 pint"},
    {name: "Feta cheese", search: "feta cheese", qty: "8 oz"},
    {name: "Hummus", search: "hummus", qty: "10 oz"}
  ];
  
  let currentIndex = 0;
  
  function addNextItem() {
    if (currentIndex >= items.length) {
      alert('All items added!');
      return;
    }
    
    const item = items[currentIndex];
    console.log('Adding:', item.name);
    
    // Navigate to search
    const searchBox = document.querySelector('input[data-testid="search-input"], input[placeholder*="Search"], #search-input');
    if (searchBox) {
      searchBox.value = item.search;
      searchBox.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Trigger search
      setTimeout(() => {
        const searchBtn = document.querySelector('button[data-testid="search-button"], button[type="submit"]');
        if (searchBtn) searchBtn.click();
        
        // Wait for results and add first item
        setTimeout(() => {
          const addBtn = document.querySelector('button[data-testid="add-to-cart"], button:contains("Add"), .add-to-cart-btn');
          if (addBtn) {
            addBtn.click();
            console.log('Added:', item.name);
          }
          
          currentIndex++;
          setTimeout(addNextItem, 2000); // Wait 2 seconds between items
        }, 3000);
      }, 500);
    } else {
      alert('Please navigate to heb.com first!');
    }
  }
  
  if (confirm('Add ' + items.length + ' items to HEB cart? Make sure you are logged in to heb.com')) {
    addNextItem();
  }
})();
