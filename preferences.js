define(function main(require, exports, module) {
    var PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
        prefs = PreferencesManager.getExtensionPrefs("brackets-nodejs-HBUI");

    // Default settings
    prefs.definePreference("node-bin", "string", "");
    prefs.definePreference("hb-ui", "string", "");
    prefs.definePreference("autoscroll", "boolean", true);
    prefs.definePreference("v8-flags", "string", "");

    // Conversion from the old localstorage
    if("node-node" in localStorage) {
        prefs.set("node-bin", localStorage["node-node"]);
        localStorage.removeItem("node-node");
    }

    if("hb-ui" in localStorage) {
        prefs.set("hb-ui", localStorage["hb-ui"]);
        localStorage.removeItem("hb-ui");
    }

    if("v8-flags" in localStorage) {
	   prefs.set("v8-flags", localStorage["v8-flags"]);
	   localStorage.removeItem("v8-flags");
    }

    prefs.save();

    module.exports = prefs;
});
