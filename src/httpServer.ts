import { createServer } from 'http';

const port = process.env.PORT || 8000;

const requestListener = function(req: any, res: any) {
  res.writeHead(200);
  res.end('Hello world.');
};

const httpServer = createServer(requestListener);
export function startHttpServer() {
  httpServer.listen(port, () => {
    console.log(`Simple http server listening on port ${port}`);
  });
}
