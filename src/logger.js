const fs = require('fs');
const path = require('path');

class Logger {
    constructor(logFilePath) {
        this.logFilePath = logFilePath;
        // Clear log file on start
        fs.writeFileSync(this.logFilePath, '', 'utf-8');
    }

    _timestamp() {
        return new Date().toISOString();
    }

    _write(level, domain, message, extra = '') {
        const prefix = domain ? `[${domain}]` : '';
        const line = `${this._timestamp()} ${level.padEnd(5)} ${prefix}${prefix ? ': ' : ''}${message}${extra ? ' ' + JSON.stringify(extra) : ''}\n`;
        fs.appendFileSync(this.logFilePath, line, 'utf-8');
        process.stdout.write(line);
    }

    info(domain, message, extra) {
        this._write('INFO', domain, message, extra);
    }

    warn(domain, message, extra) {
        this._write('WARN', domain, message, extra);
    }

    error(domain, message, extra) {
        this._write('ERROR', domain, message, extra);
    }

    statistics(domain, stats) {
        this._write('INFO', domain, `Final request statistics: ${JSON.stringify(stats)}`);
    }
}

module.exports = Logger;
