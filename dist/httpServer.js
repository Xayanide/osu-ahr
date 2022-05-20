"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHttpServer = void 0;
const http_1 = require("http");
const port = process.env.PORT || 8000;
const requestListener = function (req, res) {
    res.writeHead(200);
    res.end('Hello world.');
};
const httpServer = (0, http_1.createServer)(requestListener);
function startHttpServer() {
    httpServer.listen(port, () => {
        console.log(`Simple http server listening on port ${port}`);
    });
}
exports.startHttpServer = startHttpServer;
//# sourceMappingURL=httpServer.js.map