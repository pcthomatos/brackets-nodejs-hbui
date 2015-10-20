(function () {
    "use strict";

    var treekill = require("treekill"),
        exec = require("child_process").exec,
        domain = null,
        child = null,
        DOMAIN_NAME = "brackets-nodejs-hbui";

    function cmdStartProcess(command, nodePath, cb) {
        if(child !== null) {
            treekill(child.pid);
        }

        process.env.PATH = process.env.PATH + ':' + nodePath.replace(/\/node$/, '/');

        child = exec(command, {cwd: undefined,env: process.env});

        var red   = '\\x1B[31m',
            green = '\\x1B[32m',
            reset = '\\x1B[0m';

        // Send data to the client
        var send = function(data) {
            data = data.toString().replace(/\\*\x1B\[/g, "\\x1B[");

            domain.emitEvent(DOMAIN_NAME, "output", green + data + reset);
        },
        sendError = function(data) {
            data = data.toString().replace(/\x1B\[/g, "\\x1B[");

            domain.emitEvent(DOMAIN_NAME, "output", red + data + reset);
        };

        child.stdout.on("data", send);
        child.stderr.on("data", sendError);

        child.on("exit", function(code) {
            cb(null, code);
        });

        child.on("error", function(err) {
            cb(err);
        });
    }

    function cmdStopProcess() {
        if(child !== null) {
            treekill(child.pid);
        }
    }

    function init(domainManager) {
        domain = domainManager;

        if(!domainManager.hasDomain(DOMAIN_NAME)) {
            domainManager.registerDomain(DOMAIN_NAME, {
                major: 0,
                minor: 0
            });
        }

        domainManager.registerCommand(
            DOMAIN_NAME,
            "startProcess",
            cmdStartProcess,
            true,
            "Starts the process using the supplied command",
            [
                {
                    name: "command",
                    type: "string"
                },
                {
                    name: "cwd",
                    type: "string"
                }
            ]
        );

        domainManager.registerCommand(
            DOMAIN_NAME,
            "stopProcess",
            cmdStopProcess,
            false,
            "Stops the process if one is already started",
            []
        );

        domainManager.registerEvent(
            DOMAIN_NAME,
            "output",
            [
                {
                    name: "output",
                    type: "string"
                }
            ]
        );
    }

    exports.init = init;

}());