import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }, // iPhone SE size
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5000...');
  await page.goto('http://localhost:5000');

  console.log('Logging in...');
  // Assuming there is a quick login or we can just inject a mock user or use the UI
  await page.goto('http://localhost:5000/login');
  await page.fill('input[type="email"]', 'user@example.com');
  await page.fill('input[type="password"]', 'password123');
  // Or we just mock the fetch or local storage if needed. Let's see if login works.
  // Actually, wait, it might need real DB. Let's try injecting the user state if possible.
  // We can just click the login button assuming there's a default or we can register.
  
  // A safer way without DB data: just inject into localStorage if we know the key, 
  // but it's an HTTP only cookie perhaps? Let's check auth.tsx later.
  // For now, let's just create a new user.
  await page.goto('http://localhost:5000/register');
  await page.fill('input[name="firstName"]', 'Test');
  await page.fill('input[name="lastName"]', 'User');
  const email = `test${Date.now()}@example.com`;
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await page.waitForURL('http://localhost:5000/');
  console.log('Logged in successfully!');

  // Wait for the hero section to load
  await page.waitForSelector('.hero');

  // Let's get the bounding box of the hero title or button
  const button = await page.$('.hero .btn');
  if (button) {
    const box = await button.boundingBox();
    console.log('Hero Button BoundingBox:', box);
    if (box) {
      // Find element at center of button
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      console.log(`Checking element at ${centerX}, ${centerY}...`);
      
      const elementInfo = await page.evaluate(({x, y}) => {
        const el = document.elementFromPoint(x, y);
        if (!el) return null;
        return {
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          outerHTML: el.outerHTML.substring(0, 150)
        };
      }, { x: centerX, y: centerY });

      console.log('Element receiving click:', elementInfo);
      
      // Let's also check a bit higher, around the title
      const title = await page.$('.hero__title');
      const titleBox = await title.boundingBox();
      console.log('Title BoundingBox:', titleBox);
      if (titleBox) {
        const tX = titleBox.x + titleBox.width / 2;
        const tY = titleBox.y + titleBox.height / 2;
        const tInfo = await page.evaluate(({x, y}) => {
          const el = document.elementFromPoint(x, y);
          return el ? { tagName: el.tagName, className: el.className } : null;
        }, { x: tX, y: tY });
        console.log('Element at Title center:', tInfo);
      }
    }
  }

  await browser.close();
})();
