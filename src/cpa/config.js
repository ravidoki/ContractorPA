var dojoConfig = {
    baseUrl: "src/",
    async: true,
    isDebug: true,
    tlmSiblingOfDojo: false,
    aliases: [
        ["domReady", "dojo/domReady"]
    ],
    packages: [
		{ name: "dojo", location: "dojo" },
        { name: "dijit", location: "dijit" },
        { name: "dojox", location: "dojox" },
        { name: "doh", location: "util/doh" },
        { name: "cpa", location: "cpa" }
    ]
};