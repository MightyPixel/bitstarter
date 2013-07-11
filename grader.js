#!/usr/bin/env node
/*
 * Automatically grade files for the presence of specified HTML tags/attributes.
 * Uses commander.js and cheerio. Teaches command line application development
 * and basic DOM parsing.
 *
 * References:
 *
 *  + cheerio
 *     - https://github.com/MatthewMueller/cheerio
 *     - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
 *     - http://maxogden.com/scraping-with-node.html
 *
 *  + commander.js
 *     - https://github.com/visionmedia/commander.js
 *     - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy
 *
 *  + JSON
 *     - http://en.wikipedia.org/wiki/JSON
 *     - https://developer.mozilla.org/en-US/docs/JSON
 *     - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
 */

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var sys = require('util');

var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";
var URL_DEFAULT = "http://google.com";


var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var assertUrlValid = function(inUrl) {
    var url_rex = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    if (url_rex.test(inUrl) == false) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return inUrl;
}

var cheerioHtmlFile = function(htmlfile) {
    return cheerio.load(fs.readFileSync(htmlfile));
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var checkHtml = function(html, checksFile) {
    var checks = loadChecks(checksFile).sort();
    var out = {};
    for(var ii in checks) {
        var present = html(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }

    return out;
};

var checkHtmlFile = function(htmlfile, checksFile) {
    $ = cheerioHtmlFile(htmlfile);
    return checkHtml($, checksFile);
};

var checkUrl = function(url, checksFile) {
    rest.get(url).on('complete', function(result) {
        if (result instanceof Error) {
            sys.puts('Error: ' + result.message);
            this.retry(5000); // try again after 5 sec
        } else {
            var checkJson = checkHtml(cheerio.load(result), checksFile); 
            printFormatedJson(checkJson);
        }
    }); 
};

var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

var printFormatedJson = function(rawJson) {
    var outJson = JSON.stringify(rawJson, null, 4);
    console.log(outJson);
}

if(require.main == module) {
    program
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
        .option('-f, --file <html_file>', 'Path to index.html', clone(assertFileExists), HTMLFILE_DEFAULT)
        .option('-u, --url <url_file>', 'URL to index.html', clone(assertUrlValid), URL_DEFAULT)
        .parse(process.argv);
    if (process.argv[2] == '-u' && process.argv[2] == '--url') {
        checkUrl(program.url, program.checks);
    } else {
        var checkJson = checkHtmlFile(program.file, program.checks);
        printFormatedJson(checkJson);
    }
} else {
    exports.checkHtmlFile = checkHtmlFile;
}
