# tenor.js
Control-flow library using dependency injection 

Imagine, that by defining dependencies between functions you could craete your "perfect" asynchronous flow, without choosing callback style or promises.

Just compose and execute:

```javascript
const execute = require('tenor');

const profiles = {
  '15895cb3001': {},
  '12ad476a700': {}
};

function getCityOfUser(id, time) {
  return new Promise((resolve, reject) => {
    resolve({
      id: id,
      timeZone: time.getTimezoneOffset()
    });
  });
}

const flow = {
  user(callback) {
    request.get('/api/get-current-user/', (err, response) => {
      return callback(err, response.body);
    });
  },
  
  city(profile, time) {
    // profile variable is already resolved and has value profiles[user.id]
    // time variable is already resolved and contains current time
    return getCityOfUser(profile.id, time); // returns promise
  },

  time() {
     return new Date(); // return directly
  },

  profile(user) {
    // user variable is already resolved by user function and contains response from server
    return profiles[user.id];
  }
};

execute(flow, (profile, city) => {
  // profile will have value from profiles
  // city will have result of the resolved promise
});
// "execute" returns promise which can be passed further
// if error appeared .catch() can be used to track it
```

The nice part of it, is that you don't have to think about the order in which you write functions, like in `async.waterfall` or `async.series`. Tenor.js will do it for you based on the dependencies ( arguments ) defined on your functions.

For example `city` function requires `profile` and `time` variables, `profile` function needs `user` variable. Tenor.js knows it all and will start execute functions in correct order to get the correct result. The order of execution will be as follow: first `user()`, then `profile()` and `time()`, then `city()`. The result of the executed function will be fed as parameter to the next function.

Another point is that in order to make it work you don't have to specify all the defined functions in the final callback `(profile, city) => {}` only those that you need. There are `profile` and `city` required, tenor.js already knows how to resolve them so execution will be in correct order. Also the order of them is not important, it's all about the value which you get inside the final callback.

