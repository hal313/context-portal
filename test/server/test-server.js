import * as ServeHandler from 'serve-handler';
import * as http from 'http';

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
