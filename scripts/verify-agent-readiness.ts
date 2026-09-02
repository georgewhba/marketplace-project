import http from 'http';

const verify = () => {
  return new Promise<void>((resolve) => {
    console.log("Verifying Agent Readiness...");

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/robots.txt',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 && data.includes('User-agent: GPTBot')) {
          console.log("✅ robots.txt is present and configured correctly.");
        } else {
          console.error("❌ robots.txt verification failed.", res.statusCode);
        }
        
        // Test Content Negotiation
        const mdOptions = {
          hostname: 'localhost',
          port: 5000,
          path: '/api/store/products/test-slug',
          method: 'GET',
          headers: {
            'Accept': 'text/markdown'
          }
        };

        const reqMd = http.request(mdOptions, (resMd) => {
          let mdData = '';
          resMd.on('data', (chunk) => mdData += chunk);
          resMd.on('end', () => {
            // Note: DB might not have "test-slug" so we get 404, but check Link headers
            if (resMd.headers['link'] && (resMd.headers['link'] as string).includes('/api/catalog')) {
              console.log("✅ Global Link headers are correctly injected.");
            } else {
              console.error("❌ Global Link headers are missing.");
            }
            resolve();
          });
        });
        reqMd.end();
      });
    });

    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
      resolve();
    });

    req.end();
  });
};

verify();
