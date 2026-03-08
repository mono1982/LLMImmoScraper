const fs = require('fs');

class Logger {
    /**
     * @param {object} options
     * @param {string} [options.logFile]  - Path to log file (omit for stderr-only)
     * @param {boolean} [options.quiet]   - Suppress all log output
     */
    constructor({ logFile = null, quiet = false } = {}) {
        this.logFile = logFile;
        this.quiet = quiet;

        // Clear log file on start if using file mode
        if (this.logFile) {
            fs.writeFileSync(this.logFile, '', 'utf-8');
        }
    }

    _timestamp() {
        return new Date().toISOString();
    }

    _write(level, domain, message, extra = '') {
        if (this.quiet) return;

        const prefix = domain ? `[${domain}]` : '';
        const line = `${this._timestamp()} ${level.padEnd(5)} ${prefix}${prefix ? ': ' : ''}${message}${extra ? ' ' + JSON.stringify(extra) : ''}\n`;

        // Always write to stderr (never pollutes stdout)
        process.stderr.write(line);

        // Optionally also write to log file
        if (this.logFile) {
            fs.appendFileSync(this.logFile, line, 'utf-8');
        }
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
