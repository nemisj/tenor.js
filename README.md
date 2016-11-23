# tenor.js
Control-flow library using dependency injection 

Imagine, that by defining dependencies between functions you could craete your "perfect" asynchronous flow, without choosing callback style or promises.

Just compose and execute:

```javascript
const execute = require('tenor');

const flow = {
  user(callback) {
    request.get('/api/get-current-user/', (err, response) => {
      return callback(err, response.body);
    });
  },
  
  time() {
     return new Date().getTime(); // return directly
  },
  
  city(profile, time) {
    return getCityOfUser(profile.id, time); // returns promise
  },

  profile(user) {
    return profiles[user.id];
  }
};

execute(flow, (profile, city) => {
  // profile will have value from profiles
  // city will have result of the resolved promise
});
// execute returns promise which can be passed further
```

