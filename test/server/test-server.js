import * as ServeHandler from 'serve-handler';
import * as http from 'http';

// This file sets up an HTTP server which will help with automated testing. Because the original tests are in Mocha,
// this will allow for automated testing by serving the pages and avoiding any cross origin restrictions. This can
// also be used during development in the case where the current IDE does not live serve pages.
//
// Sending a request to '/stop' will stop the server and terminate the process (useful on CI servers)

// Get the handler
const handler = ServeHandler.default;

// Start the server
const server = http.createServer((request, response) => {
    // If the request is for '/stop', then stop the server
    if ('/stop' === request.url) {
        server.close();
    }
    return handler(request, response);
});

// Announce that the server has started
server.listen(3000, () => {
  console.log('Server started at http://localhost:3000');
});
