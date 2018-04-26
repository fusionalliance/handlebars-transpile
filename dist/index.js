'use strict';
/**
* Build tool for locally building handlebars templates.
*
* JSONContent - JSON Content to be injected into the templates
* Partials - Header / Footer etc
* Templates - Actual Pages
*
* 1. Init requires and vars
* 2. Load Handlebars Template Partials
* 3. Load Main (Page) Handlebars templates
* 4. Write HTML or HBS files
*/
// Requires

var fs = require('fs');
var path = require('path');
var Handlebars = require('handlebars');
var junk = require('junk');
var requireUncached = require('require-uncached');

var hbsTranspile = function hbsTranspile(config) {
    console.log('=== Starting Handlebars Build ===');

    // Config
    hbsTranspile.inputDir = config.inputDir; // DRA = "./views" || CrownPeak = "./"
    hbsTranspile.outputDir = config.outputDir;
    hbsTranspile.helpersDir = config.inputDir + config.helpersDir;
    hbsTranspile.partialsDir = config.inputDir + config.partialsDir;
    hbsTranspile.templatesDir = config.inputDir + config.templatesDir;
    hbsTranspile.JSONDir = config.inputDir + config.JSONDir;
    hbsTranspile.ext = config.ext; // DRA = ".hbs" || CrownPeak = ".html"
    hbsTranspile.partialData = { ENV: process.env };
    hbsTranspile.partials; // Array of Partials (files)
    hbsTranspile.jsonContent; // Array of JSON Files
    hbsTranspile.templates; // Array of Page Templates (Final Pages)

    // Initially set the filter to an empty array
    hbsTranspile.filter = [];
    if (config.filter) {
        hbsTranspile.filter = config.filter;
    }

    // Functions
    hbsTranspile.walk = walk;
    hbsTranspile.setDirectory = setDirectory;
    hbsTranspile.walkCallback = walkCallback;
    hbsTranspile.setHelpers = registerHelpers;
    hbsTranspile.setPartials = setPartials;
    hbsTranspile.setJSONContent = setJSONContent;
    hbsTranspile.setTemplates = setTemplates;

    // Pass in empty arrays for filter option for everything except templates
    hbsTranspile.walkCallback(hbsTranspile.JSONDir, [], hbsTranspile.setJSONContent);
    hbsTranspile.walkCallback(hbsTranspile.helpersDir, [], hbsTranspile.setHelpers);
    hbsTranspile.walkCallback(hbsTranspile.partialsDir, [], hbsTranspile.setPartials);
    hbsTranspile.walkCallback(hbsTranspile.templatesDir, hbsTranspile.filter, hbsTranspile.setTemplates);
};

var walk = function walk(directory) {
    /** 
     * Sanity Check: Handle Non Existent Directories by returning an empty array.
     * The Catch: module will not error out due to a non existent directory, however, if there are
     *   partials / helpers included in the templates and this module doesn't find them due to 
     *   the wrong directory passed into the config, handlebars will error out and the build will fail.
     *   That is a part of the Handlebars module itself. 
     */
    if (!fs.existsSync(directory)) {
        console.log('=== Directory Does Not Exist: ' + directory + ' ===');
        return [];
    }

    function directoryWalker(dir) {
        var items = fs.readdirSync(dir).filter(junk.not).map(function (item) {
            return path.join(dir, item);
        });
        var files = items.filter(function (item) {
            return fs.statSync(item).isFile();
        });
        var subDirs = items.filter(function (item) {
            return fs.statSync(item).isDirectory();
        });

        return subDirs.reduce(function (contents, subDir) {
            return contents.concat(directoryWalker(subDir));
        }, files);
    }

    return directoryWalker(path.resolve(directory)).map(function (item) {
        return item.substr(path.resolve(directory).length + path.sep.length);
    });
};

var walkCallback = function walkCallback(dir, filter, done) {
    var contents = walk(dir);
    if (filter.length > 0) {
        contents = contents.filter(function (content) {
            return filter.indexOf(content) !== -1;
        });
    }
    done(null, contents);
};

var setPartials = function setPartials(err, results) {
    if (err) {
        console.log('ERROR: ', err);
    } else {
        var partials = results;
        // Load Partials into partialData Object to pass to main templates.
        partials.forEach(function (partial) {
            var fileName = partial.split(".")[0];
            var onlyPath = path.dirname(partial);
            setDirectory(onlyPath);
            // Get the Partial Data in Buffers to an array
            hbsTranspile.partialData[fileName] = fs.readFileSync(hbsTranspile.partialsDir + partial);

            Handlebars.registerPartial(fileName, hbsTranspile.partialData[fileName].toString());
        });
    }
};

var setJSONContent = function setJSONContent(err, results) {
    if (err) {
        console.log('ERROR: ', err);
    } else {
        var jsonContent = results;
        // Load JSON into the "Partials Object"
        jsonContent.forEach(function (content) {
            var contentName = content.split(".")[0];
            var onlyPath = path.dirname(content);
            setDirectory(onlyPath);
            // Used Require to get a JSON Object
            hbsTranspile.partialData[contentName] = JSON.parse(fs.readFileSync(hbsTranspile.JSONDir + content));
        });
    }
};

var registerHelpers = function registerHelpers(err, results) {
    if (err) {
        console.log('ERROR: ', err);
    } else {
        var helpers = results;
        // Load Helpers
        helpers.forEach(function (helper) {
            var fileName = helper.split('.').shift();
            var fullPath = path.resolve('' + hbsTranspile.helpersDir + helper);

            var fn = requireUncached(fullPath);
            Handlebars.registerHelper(fileName, fn);

            console.log('=== Registered Helper: ' + fileName + ' ===');
        });
        console.log('=== Finished Helper Registration ===');
    }
};

var setTemplates = function setTemplates(err, results) {
    if (err) {
        console.log('ERROR: ', err);
    } else {
        var templates = results;
        // Load Template Files, Compile, Write
        templates.forEach(function (template) {
            // Capture the Filename to use as the HTML filename
            var fileName = template.split(".")[0];
            var onlyPath = path.dirname(template);

            // Read the source of the template
            var source = fs.readFileSync(hbsTranspile.templatesDir + template);
            source = source.toString('utf8');
            // Puts the Partials into the "Main" Template
            var compiled = Handlebars.compile(source, { noEscape: true });
            var result = compiled(hbsTranspile.partialData);

            var output = hbsTranspile.outputDir + fileName + hbsTranspile.ext;
            var onlyPath = path.dirname(output);
            setDirectory(onlyPath);

            // Write Compiled Templates to HTML Files.
            fs.writeFileSync(output, result);
            console.log('=== Compiled: ', fileName + hbsTranspile.ext, ' ===');
        });
        console.log('=== Finished Handlebars Build ===');
    }
};

var setDirectory = function setDirectory(onlyPath) {
    if (!fs.existsSync(onlyPath)) {
        fs.mkdirSync(onlyPath);
    }
};

module.exports = hbsTranspile;