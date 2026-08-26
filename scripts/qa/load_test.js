import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

// Load the JSON data via SharedArray so it's only loaded once per VU
const testData = new SharedArray('users', function () {
  return JSON.parse(open('./test-data.json')).users;
});
const { baseUrl } = JSON.parse(open('./test-data.json'));

export const options = {
  scenarios: { 
    concurrent_checkout: { 
      executor: 'shared-iterations', 
      vus: 500, 
      iterations: 500 
    } 
  },
};

export default function () {
  // Each iteration gets a unique user based on __ITER
  const user = testData[__ITER % testData.length];
  
  const payload = JSON.stringify({
    addressId: user.addressId
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.token}`,
    },
  };

  const res = http.post(`${baseUrl}/api/orders`, payload, params);

  // Status is either 201 (Created) if they successfully got the item
  // Or 400 (Bad Request - Insufficient stock) if they were too late
  check(res, { 
    'status is 201 or 400': (r) => r.status === 201 || r.status === 400 
  });
}
