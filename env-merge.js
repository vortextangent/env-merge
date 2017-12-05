#!/usr/bin/env node
var app = require('commander');
var appVersion = require('./package.json').version;
var chalk = require('chalk');
var fs = require('fs');

function list(val) {
    return val.split(',').map(String);
}

function getEnvArray(fileName) {
    var dotenvFile = require('dotenv').config({
        'path': fileName
    });
    return dotenvFile.parsed;
};

function getMissing(check, template) {
    var missing = {};
    for (var property in template) {
        if (!check.hasOwnProperty(property)) {
            missing[property] = template[property];
        }
    }
    return missing;
}

function quoteString(unquoted) {
    if (unquoted.indexOf(' ') !== -1) {
        return "'" + unquoted + "'";
    }
    return unquoted;
}

function writeVariables(filename, variablesToWrite) {
    var stream = fs.createWriteStream(filename, {
        'flags': 'a',
        'encoding': null,
        'mode': 0666
    });
    stream.once('open', function (fd) {
        if (app.verbose) {
            console.log(chalk.cyan("Opened file: " + fd));
        }
        for (var property in variablesToWrite) {
            var line = "\n" + property + "=" + quoteString(variablesToWrite[property]);
            if (app.verbose) {
                console.log(chalk.cyan(line.replace(/\n/, '')));
            }
            stream.write(line);
        }
        stream.end();
    });
}

app
    .version(appVersion)
    .option('-t, --trim', 'Removes settings no longer in .env.dist from local variants.', 0)
    .option('-e, --environments [environments]', 'list of environments to process. Defaults to stage,local,dev.', list, [
        'stage',
        'local',
        'dev'
    ])
    .option('-v, --verbose', 'Show more verbose output', false)
    .parse(process.argv);


if (app.environments.length > 0) {
    var file = process.cwd() + '/.env.dist';

    if (app.verbose) {
        console.log(chalk.yellow(file));
    }

    try {
        envDist = getEnvArray(file);
    }
    catch (err) {
        console.error(chalk.red(err.message));
        process.exit(1);
    }

    app.environments.forEach(function (env, index) {
        var filename;

        if (env === 'dev') {
            filename = process.cwd() + '/.env';
        } else {
            filename = process.cwd() + '/.env.' + env;
        }

        if (app.verbose) {
            console.log(chalk.green('Processing: ' + env));
        }

        try {

            var envLocal = getEnvArray(filename);

            var localMissing = getMissing(envLocal, envDist);
            var distMissing = getMissing(envDist, envLocal);
            if (app.verbose) {
                console.log("Local missing: ");
                console.log(localMissing);
                console.log("Dist missing: ");
                console.log(distMissing);
            }
            if (Object.keys(localMissing).length > 0) {
                writeVariables(filename, localMissing);
            }

            if (Object.keys(distMissing).length > 0) {
                if (app.trim) {
                    // deleteVariables(filename, distMissing);
                }
            }

        }
        catch (err) {
            console.log(chalk.blue(filename + ' is missing.'));
        }
    });
    console.log(chalk.green('Done.'));
} else {
    console.error(chalk.red("No environment files specified"));
    process.exit(1);
}