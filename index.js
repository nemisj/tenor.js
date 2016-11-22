'use strict';

function getArguments(func) {
  if (typeof func !== 'function') {
    throw new Error('It is not a function');
  }
  const str = Function.prototype.toString.apply(func);
  const matched = str.match(/\(([^)]*)\)/);
  if (!matched) {
    throw new Error('Something went wrong with arguments'); 
  }

  const argsString = matched[1].trim();
  return matched[1].split(',').map((arg) => {
    return arg.replace(/\/\*.*?\*\//g, '').trim()
  }).filter(arg => arg !== '');
}

const enumerators = {
  object(obj, fnc) {
    Object.keys(obj).forEach((name) => {
      fnc(name, obj[name]);
    });
  }
};

/**
 * Tree
 * root: {
 *    arguments: [],
 *    children: {
 *  }
 *
 */
function buildMap(obj, enumerator) {
  enumerator = enumerator || enumerators.object;

  const uniqueArguments = {};
  const map = {};

  enumerator(obj, (name, func) => {
    const dependencies = getArguments(func);
    map[name] = { func, dependencies };
    dependencies.forEach((argName) => {
      uniqueArguments[argName] = true;
    });
  });

  // test wether all the functions are presented
  Object.keys(uniqueArguments).forEach((name) => {
    if (name in map === false) {
      throw new Error(`"${name}" is not found`);
    }
  });

  // find the loops
  Object.keys(map).forEach((name) => {
    checkDependencies(map, name);
  });

  return map;
}

function checkDependencies(map, name, stack) {
  // initialize empty if this is the first run
  stack = stack || [];

  if (stack.indexOf(name) !== -1) {
    throw new Error('Found circular reference: ' + stack.join(' > '));
  }
  stack.push(name);
  map[name].dependencies.forEach((dependencyName) => {
    checkDependencies(map, dependencyName, stack);
  });
  stack.pop();
}

/**
 * will build tree 
 */
function buildTree(map, dependency) {
  const result = {};
  const def = map[dependency];
  def.dependencies.forEach();
}

function buildDependencies(map, rootDepedendencies, list) {
  const dependencies = list || {};

  rootDepedendencies.forEach((name) => {
    const child = map[name];
    if (!child) {
      //XXX: don't throw, he?
      throw new Error(`Unable to find dependency: ${name}`);
    }
    dependencies[name] = child.dependencies.concat([]);
    buildDependencies(map,  child.dependencies, dependencies);
  });

  return dependencies;
}

function newCollector() {
  const collector = {
    counter: 0,
    createCallback(n) {
      return (error, value) => {
        collector.counter++;
        collector._func(n, { value, error: null }, collector.counter);
      };
    },
    add(n, promise) {
      if (!promise) {
        collector.counter++;
        collector._func(n, { value: 'value_of_' + n, error: null }, collector.counter);
        return;
      }
      promise.then((value) => {
        collector.counter++;
        collector._func(n, { value, error: null }, collector.counter);
      }, (error) => {
        collector.counter++;
        collector._func(n, { value: null, error }, collector.counter);
      });
    },

    onComplete(func) {
      collector._func = func;
    }
  };

  return collector;
}


function runStack(stack, resolved, map, all) {
  console.log('runStack', stack);
  return new Promise((resolve, reject) => {

    let done = false;
    const nextStack = [];
    const collector = newCollector();
    collector.onComplete((name, results, index) => {
      if (done) {
        // don't care any more
        return;
      }

      // remove from the all, so we can track, what is left
      delete all[name];

      // add result to resolved items
      resolved[name] = results;

      if (results.error) {
        done = true;
        return reject({
          name,
          error
        });
      }

      // find item for next stack
      // and remove dependency
      Object.keys(all).forEach((dependencyName) => {
        const foundIndex = all[dependencyName].indexOf(name);
        if (foundIndex !== -1) {
          // remove dependency, since it's resolved
          all[dependencyName].splice(foundIndex, 1);
          if (all[dependencyName].length === 0) {
            nextStack.push(dependencyName);
          }
        }
      });

      if (index === stack.length) {
        done = true;
        // that was the last one
        return resolve(nextStack);
      }
    });

    stack.forEach((name) => {
      // build arguments
      const item = map[name];

      const args = item.dependencies.map((arg) => {
        if (/^(callback|handler|cb|h)$/.test(arg)) {
          return collector.createCallback(name);
        }
        return resolved[arg].value;
      });

      collector.add(name, item.func.apply(null, args));
    });
  });
}

function runner(obj, lastFunction) {
  const lastArguments = getArguments(lastFunction);
  const map = buildMap(obj);

  return new Promise((res, rej) => {
    const all = buildDependencies(map, lastArguments);
    // resolve all without arguments
    const stack = [];
    const resolved = {};

    Object.keys(all).forEach((name) => {
      if (all[name].length === 0) {
        stack.push(name);
      }
    });

    const next = (s) => {
      return runStack(s, resolved, map, all)
        .then((nextStack)=> {
          if (Object.keys(all).length === 0) {
            // done
            return true;
          } else {
            return next(nextStack);
          }
        });
    };

    next(stack)
      .then((done) => {
        const args = lastArguments.map((name) => resolved[name].value);
        // call last function
        res(lastFunction.apply(null, args));
      }, (error) => {
        console.log('error', error.stack);
      })
  });
};

module.exports = runner;
module.exports.getArguments = getArguments;
module.exports.buildMap= buildMap;
