define(function (require, exports, module) {
    "use strict";

    /** --- MODULES --- **/
    var CommandManager = brackets.getModule("command/CommandManager"),
        Menus = brackets.getModule("command/Menus"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        WorkspaceManager = brackets.getModule("view/WorkspaceManager"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        NodeDomain = brackets.getModule("utils/NodeDomain"),
        ProjectManager = brackets.getModule("project/ProjectManager"),
        Dialogs = brackets.getModule("widgets/Dialogs"),
        ansi = require("./ansi"),
        prefs = require("./preferences"),
        NodeMenuID = "hb",
        NodeMenu = Menus.addMenu("HB", NodeMenuID),
        NODE_SETTINGS_DIALOG_ID = "hb-settings-dialog",
        NODE_INSTALL_DIALOG_ID = "node-install-dialog",
        NODE_EXEC_DIALOG_ID = "node-exec-dialog",
        LS_PREFIX = "node-",
        DOMAIN_NAME = "brackets-nodejs-hbui",
        scrollEnabled = prefs.get("autoscroll");

    var domain = new NodeDomain(DOMAIN_NAME, ExtensionUtils.getModulePath(module, "node/processDomain"));

    domain.on("output", function(info, data) {
        Panel.write(data);
    });

    var buildHB = function(command){
            var nodeBin = prefs.get("node-bin");

            if(nodeBin === "") {
                nodeBin = "node";
            }

            Panel.show(command);
            Panel.clear();

            domain.exec("startProcess", command, nodeBin)
                .done(function(exitCode) {
                    Panel.write("Program exited with status code of " + exitCode + ".");
                }).fail(function(err) {
                    Panel.write("Error inside brackets-nodejs' processes occured: \n" + err);
                });
        };

    /**
     * Panel alias terminal
     */
    $(".content").append(require("text!html/panel.html"));
    var Panel = {

        id: "brackets-nodejs-terminal",
        panel: null,
        commandTitle: null,
        height: 201,

        get: function (qs) {
            return this.panel.querySelector(qs);
        },

        /**
         * Basic functionality
         */
        show: function (command) {
            this.panel.style.display = "block";
            this.commandTitle.textContent = command;
            WorkspaceManager.recomputeLayout();
        },
        hide: function () {
            this.panel.style.display = "none";
            WorkspaceManager.recomputeLayout();
        },
        clear: function () {
            this.pre.innerHTML = null;
        },

        /**
         * Prints a string into the terminal
         * It will be colored and then escape to prohibit XSS (Yes, inside an editor!)
         *
         * @param: String to be output
         */
        write: function (str) {
            var e = document.createElement("span");
            e.innerHTML = ansi(str.replace(/</g, "&lt;").replace(/>/g, "&gt;"));

            var scroll = false;
            if (this.pre.parentNode.scrollTop === 0 || this.pre.parentNode.scrollTop === this.pre.parentNode.scrollHeight || this.pre.parentNode.scrollHeight - this.pre.parentNode.scrollTop === this.pre.parentNode.clientHeight) {
                scroll = true;
            }

            this.pre.appendChild(e);

            if (scroll && scrollEnabled) {
                this.pre.parentNode.scrollTop = this.pre.parentNode.scrollHeight;
            }
        },

        /**
         * Used to enable resizing the panel
         */
        mousemove: function (e) {

            var h = Panel.height + (Panel.y - e.pageY);
            Panel.panel.style.height = h + "px";
            WorkspaceManager.recomputeLayout();

        },
        mouseup: function (e) {

            document.removeEventListener("mousemove", Panel.mousemove);
            document.removeEventListener("mouseup", Panel.mouseup);

            Panel.height = Panel.height + (Panel.y - e.pageY);

        },
        y: 0
    };

    // Still resizing
    Panel.panel = document.getElementById(Panel.id);
    Panel.commandTitle = Panel.get(".cmd");
    Panel.pre = Panel.get(".table-container pre");
    Panel.get(".resize").addEventListener("mousedown", function (e) {

        Panel.y = e.pageY;

        document.addEventListener("mousemove", Panel.mousemove);
        document.addEventListener("mouseup", Panel.mouseup);

    });

    /**
     * Terminal buttons
     */
    Panel.get(".action-close").addEventListener("click", function () {
        domain.exec("stopProcess");
        Panel.hide();
    });
    Panel.get(".action-terminate").addEventListener("click", function () {
        domain.exec("stopProcess");
    });
    Panel.get(".action-rerun").addEventListener("click", function () {
        buildHB(prefs.get("hb-ui"));
    });

    var Dialog = {
        /**
         * The settings modal is used to configure the path to node's and node's binary
         * HTML : html/modal-settings.html
         */
        settings: {

            /**
             * HTML put inside the dialog
             */
            html: require("text!html/modal-settings.html"),

            /**
             * Opens up the modal
             */
            show: function () {
                Dialogs.showModalDialog(
                    NODE_SETTINGS_DIALOG_ID, // ID the specify the dialog
                    "Node.js-Configuration", // Title
                    this.html, // HTML-Content
                    [ // Buttons
                        {
                            className: Dialogs.DIALOG_BTN_CLASS_PRIMARY,
                            id: Dialogs.DIALOG_BTN_OK,
                            text: "Save"
                        }, {
                            className: Dialogs.DIALOG_BTN_CLASS_NORMAL,
                            id: Dialogs.DIALOG_BTN_CANCEL,
                            text: "Cancel"
                        }
                    ]
                ).done(function (id) {

                    // Only saving
                    if (id !== "ok") return;

                    var node = nodeInput.value,
                        build = hbBuild.value;

                    // Store autoscroll config globally
                    scrollEnabled = scrollInput.checked;

                    prefs.set("node-bin", node.trim());
                    prefs.set("hb-ui", build.trim());
                    prefs.set("autoscroll", scrollEnabled);
                    prefs.save();

                });

                // It's important to get the elements after the modal is rendered but before the done event
                var nodeInput = document.querySelector("." + NODE_SETTINGS_DIALOG_ID + " .node"),
                    hbBuild = document.querySelector("." + NODE_SETTINGS_DIALOG_ID + " .buildSH"),
                    scrollInput = document.querySelector("." + NODE_SETTINGS_DIALOG_ID + " .autoscroll");

                nodeInput.value = prefs.get("node-bin");
                hbBuild.value = prefs.get("hb-ui");
                scrollInput.checked = prefs.get("autoscroll");
            }
        }
    };

    /**
     * Menu
     */
    var RUN_CMD_ID_HB = "brackets-nodejs.run",
        CONFIG_CMD_ID = "brackets-nodejs.config";

    CommandManager.register("Build HB UI", RUN_CMD_ID_HB, function () {
        console.log(prefs)
        buildHB(prefs.get("hb-ui"));
    });

    CommandManager.register("Configuration...", CONFIG_CMD_ID, function () {
        Dialog.settings.show();

    });

    NodeMenu.addMenuItem(RUN_CMD_ID_HB, 'F9');
    NodeMenu.addMenuDivider();
    NodeMenu.addMenuItem(CONFIG_CMD_ID);

});
