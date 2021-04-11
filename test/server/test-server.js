import * as ServeHandler from 'serve-handler';
import * as http from 'http';

const handler = ServeHandler.default;
const server = http.createServer((request, response) => {
    // If the request is for '/stop', then stop the server
    if ('/stop' === request.url) {
        server.close();
    }
    return handler(request, response);
})

server.listen(3000, () => {
  console.log('Server started at http://localhost:3000');
});
