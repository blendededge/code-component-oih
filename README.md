# code-component

> A code component forked from the [elastic.io code-component](https://github.com/elasticio/code-component), runs a piece of a JavaScript code inside your flow.

## Available Variables and Libraries
Here are the available variables and libraries that can be used within the context of execution. The most up-to-date list
can always be found in be used within the context of execution or in `code.js` of the component. Below is a sample for the reference.
Built-in Node.js global objects are also supported.

### Elastic.io Specific Functionality
- `msg` - incoming message containing the payload from the previous step
- `cfg` - step's configuration. At the moment contains only one property: `code` (the code, being executed). May contain further attributes passed through the `fields` propery in the flow definition
- `snapshot` - step's snapshot
- `messages` - utility for convenient message creation
- `emitter` user to emit messages and errors

### Other Libraries/functions
- `wait(numberOfMilliscondsToSleep)` - Utility function for sleeping
- [`request`](https://github.com/request/request) - Http Client (wrapped in `co` - [this library](https://www.npmjs.com/package/co-request) so that it is pre-promisified)
- `_` - [Lodash](https://lodash.com/)

## Code component usage Examples

Use code is very simple, just do following:

```JavaScript
async function run(msg, cfg, snapshot) {
  console.log('Incoming message is %s', JSON.stringify(msg));
  const body = { result : 'Hello world!' };
  // You can emit as many data messages as required
  await this.emit('data', { body });
  console.log('Execution finished');
}
```

Please note if you have a simple one-in-one-out function you can simply return a JSON object as a result
of your function, it will be automatically emitted as data.

## Common usage scenarios

### Doing complex data transformation

[JSONata](http://jsonata.org/) is great however sometimes it's easier to do things in JavaScript, if you want to transorm
an incoming message with code, just use following sample:

```JavaScript
async function run(msg, cfg, snapshot) {
  return {
      addition: 'You can use code',
      keys: Object.keys(msg)    
  };
}
```

### Calling an external REST API

It's very simple to code a small REST API call out of the Code component, see following example:

```JavaScript
async function run(msg, cfg, snapshot) {
  const res = await request.get({
    uri: 'https://postman-echo.com/get?foo1=bar1&foo2=bar2',
    json: true  
  });
  return {
    arguments: response.body.args
  }
}
```

 
