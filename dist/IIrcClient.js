"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logPrivateMessage = exports.logIrcEvent = void 0;
const StatParser_1 = require("./parsers/StatParser");
const Loggers_1 = require("./Loggers");
const ircLogger = (0, Loggers_1.getLogger)('irc');
const pmLogger = (0, Loggers_1.getLogger)('PMLogger');
function logIrcEvent(client) {
    client.on('error', function (message) {
        ircLogger.error(`ERROR:\n${JSON.stringify(message)}\n${JSON.stringify(message.stack)}\n${message}\n${message.stack}`);
    });
    client.on('registered', function (message) {
        const args = message.args;
        ircLogger.debug('@reg %s', args?.join(', '));
    });
    client.on('message', function (from, to, message) {
        ircLogger.debug('@msg  %s => %s: %s', from, to, message);
    });
    client.on('pm', function (nick, message) {
        ircLogger.debug('@pm   %s: %s', nick, message);
    });
    client.on('join', function (channel, who) {
        ircLogger.debug('@join %s has joined %s', who, channel);
    });
    client.on('part', function (channel, who, reason) {
        ircLogger.debug('@part %s has left %s: %s', who, channel, reason);
    });
    client.on('kick', function (channel, who, by, reason) {
        ircLogger.debug('@kick %s was kicked from %s by %s: %s', who, channel, by, reason);
    });
    client.on('invite', (channel, from) => {
        ircLogger.debug(`@invt ${from} invite you to ${channel}`);
    });
    client.on('notice', function (from, to, message) {
        ircLogger.debug('@notice  %s => %s: %s', from, to, message);
    });
    client.on('action', function (from, to, text, message) {
        ircLogger.debug('@action  %s => %s: %s', from, to, text);
    });
    client.on('selfMessage', (target, toSend) => {
        ircLogger.debug('@sent bot => %s: %s', target, toSend);
    });
}
exports.logIrcEvent = logIrcEvent;
function logPrivateMessage(client) {
    client.on('message', (from, to, message) => {
        if (to === client.nick) {
            if ((0, StatParser_1.IsStatResponse)(message)) {
                pmLogger.trace(`pm ${from} -> ${message}`);
            }
            else {
                pmLogger.info(`pm ${from} -> ${message}`);
            }
        }
    });
}
exports.logPrivateMessage = logPrivateMessage;
//# sourceMappingURL=IIrcClient.js.map