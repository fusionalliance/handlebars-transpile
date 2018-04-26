'use strict';

const fs = require('fs');
const expect = require('chai').expect;
const cheerio = require('cheerio');
const del = require('del');
const hbsTranspile = require('../dist/index.js');

describe('Handlebars Transpile', () => {
    let config = {
        inputDir: './test/views/',
        outputDir: './test/output/',
        partialsDir: 'partials/',
        templatesDir: 'templates/',
        helpersDir: 'helpers/',
        JSONDir: 'jsoncontent/',
        ext: '.html',
    };

    describe('Handlebars Files Convert to HTML', () => {
        beforeEach(() => {
            del.sync([`${config.outputDir}*`],
                { dot: true });

            config = {
                inputDir: './test/views/',
                outputDir: './test/output/',
                partialsDir: 'partials/',
                templatesDir: 'templates/',
                helpersDir: 'helpers/',
                JSONDir: 'jsoncontent/',
                ext: '.html',
            };
        });

        it('should convert all handlebars templates, partials, and JSON to html', () => {
            
            hbsTranspile(config);
            const file = fs.readFileSync(`${config.outputDir}test-page.html`);
            const fileTwo = fs.readFileSync(`${config.outputDir}test-page-two.html`)
            const $ = cheerio.load(file.toString('utf-8'));
            const $Two = cheerio.load(file.toString('utf-8'));
            
            // expectations
            // Tests Partials are working
            expect($('title').text()).to.equal('Test Page');
            // Tests JSON Content is being injected
            expect($('#text1').text()).to.equal('Some Text');
            expect($Two('#text1').text()).to.equal('Some Text');
        });

        it('should only compile files in the filter array when it is provided', () => {
            config.filter = ['test-page.hbs'];

            hbsTranspile(config);
            const $ = cheerio.load(fs.readFileSync(`${config.outputDir}test-page.html`));
            const file = fs.existsSync(`${config.outputDir}test-page-two.html`);

            expect($('#text1').text()).to.equal('Some Text');
            expect(file).to.be.false;
        });

        it('should not fail if the partials directory does not exist', () => {
            config.partialsDir = 'nothing/';
            config.filter = ['test-page-no-partials.hbs'];

            hbsTranspile(config);
            const $ = cheerio.load(fs.readFileSync(`${config.outputDir}test-page-no-partials.html`));

            expect($('#text1').text()).to.equal('Some Text');
        });
    });
});