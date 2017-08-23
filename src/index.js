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
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const junk = require('junk');

let hbsTranspile = function (config) {
    console.log('=== Starting Handlebars Build ===');

    // Config
    hbsTranspile.inputDir = config.inputDir; // DRA = "./views" || CrownPeak = "./"
    hbsTranspile.outputDir = config.outputDir;
		hbsTranspile.helpersDir = config.inputDir + config.helpersDir;
    hbsTranspile.partialsDir = config.inputDir + config.partialsDir;
    hbsTranspile.templatesDir = config.inputDir + config.templatesDir;
    hbsTranspile.JSONDir = config.inputDir + config.JSONDir;
    hbsTranspile.ext = config.ext; // DRA = ".hbs" || CrownPeak = ".html"
    hbsTranspile.partialData = {};
    hbsTranspile.partials; // Array of Partials (files)
    hbsTranspile.jsonContent; // Array of JSON Files
    hbsTranspile.templates; // Array of Page Templates (Final Pages)

    // Functions
    hbsTranspile.walk = walk;
    hbsTranspile.setDirectory = setDirectory;
    hbsTranspile.walkCallback = walkCallback;
		hbsTranspile.setHelpers = registerHelpers;
    hbsTranspile.setPartials = setPartials;
    hbsTranspile.setJSONContent = setJSONContent;
    hbsTranspile.setTemplates = setTemplates;

    hbsTranspile.walkCallback(hbsTranspile.JSONDir, hbsTranspile.setJSONContent);
		hbsTranspile.walkCallback(hbsTranspile.helpersDir, hbsTranspile.setHelpers);
    hbsTranspile.walkCallback(hbsTranspile.partialsDir, hbsTranspile.setPartials);
    hbsTranspile.walkCallback(hbsTranspile.templatesDir, hbsTranspile.setTemplates);
}

const walk = function walk(directory) {
    function directoryWalker(dir) {
        const items = fs.readdirSync(dir).filter(junk.not).map(item => path.join(dir, item));
        const files = items.filter(item => fs.statSync(item).isFile());
        const subDirs = items.filter(item => fs.statSync(item).isDirectory());

        return subDirs.reduce((contents, subDir) => {
            return contents.concat(directoryWalker(subDir));
        }, files);
    }

    return directoryWalker(path.resolve(directory))
        .map((item) => {
            return item.substr(path.resolve(directory).length + path.sep.length);
        });
};

const walkCallback = function walkCallback(dir, done) {
    const contents = walk(dir);
    done(null, contents)
};

const setPartials = function setPartials(err, results) {
    if(err) {
        console.log('ERROR: ', err);
    } else {
        let partials = results;
        // Load Partials into partialData Object to pass to main templates.
        partials.forEach(function(partial) {
            let fileName = partial.split(".")[0];
            let onlyPath = path.dirname(partial);
            setDirectory(onlyPath);
            // Get the Partial Data in Buffers to an array
            hbsTranspile.partialData[fileName] = fs.readFileSync(hbsTranspile.partialsDir + partial);

            Handlebars.registerPartial(fileName, hbsTranspile.partialData[fileName].toString());
        });
    }
};

const setJSONContent = function setJSONContent(err, results) {
    if(err) {
        console.log('ERROR: ', err);
    } else {
        let jsonContent = results;
        // Load JSON into the "Partials Object"
        jsonContent.forEach(function(content) {
            var contentName = content.split(".")[0];
            var onlyPath = path.dirname(content);
            setDirectory(onlyPath);
            // Used Require to get a JSON Object
            //hbsTranspile.partialData[contentName] = require(path.resolve(hbsTranspile.JSONDir + content));
            hbsTranspile.partialData[contentName] = JSON.parse(fs.readFileSync(hbsTranspile.JSONDir + content));
        });
    }
};

const registerHelpers = function registerHelpers(err, results) {
	if (err) {
		console.log('ERROR: ', err);
	} else {
		let helpers = results;
		// Load Helpers
		helpers.forEach((helper) => {
			let fileName = helper.split('.').shift();
			let fullPath = path.resolve(`${hbsTranspile.helpersDir}${helper}`);
			// let onlyPath = path.dirname(helper);

			// let source = fs.readFileSync(`${hbsTranspile.helpersDir}${helper}`).toString('utf8');
			const fn = require(fullPath);
			Handlebars.registerHelper(fileName, fn);

			console.log(`=== Registered Helper: ${fileName} ===`);
		});
		console.log('=== Finished Helper Registration ===');
	}
};

const setTemplates = function setTemplates(err, results) {
    if(err) {
        console.log('ERROR: ', err);
    } else {
        let templates = results;
        // Load Template Files, Compile, Write
        templates.forEach(function(template) {
            // Capture the Filename to use as the HTML filename
            var fileName = template.split(".")[0];
            var onlyPath = path.dirname(template);

            // Read the source of the template
            var source = fs.readFileSync(hbsTranspile.templatesDir + template);
            source = source.toString('utf8');
            // Puts the Partials into the "Main" Template
            var compiled = Handlebars.compile(source, {noEscape: true});
            var result = compiled(hbsTranspile.partialData);

            var output = hbsTranspile.outputDir + fileName + hbsTranspile.ext;
            var onlyPath = path.dirname(output);
            setDirectory(onlyPath);

            // Write Compiled Templates to HTML Files.
            fs.writeFile(output, result, function(err) {
                if(err) {
                    return console.log(err);
                }
            });
            console.log('=== Compiled: ', fileName + hbsTranspile.ext, ' ===');
        });
        console.log('=== Finished Handlebars Build ===');
    }
};

const setDirectory = function setDirectory(onlyPath) {
  if (!fs.existsSync(onlyPath)) {
        fs.mkdirSync(onlyPath);
  }
};

module.exports = hbsTranspile;