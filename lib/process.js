(function() {
  var _, child, filteredEnvironment, fs, path, pty, systemLanguage;

  pty = require('node-pty-prebuilt-multiarch');

  path = require('path');

  fs = require('fs');

  _ = require('underscore');

  child = require('child_process');

  systemLanguage = (function() {
    var command, language;
    language = "en_US.UTF-8";
    if (process.platform === 'darwin') {
      try {
        command = 'plutil -convert json -o - ~/Library/Preferences/.GlobalPreferences.plist';
        language = `${(JSON.parse(child.execSync(command).toString()).AppleLocale)}.UTF-8`;
      } catch (error) {}
    }
    return language;
  })();

  filteredEnvironment = (function() {
    var env;
    env = _.omit(process.env, 'ATOM_HOME', 'ELECTRON_RUN_AS_NODE', 'GOOGLE_API_KEY', 'NODE_ENV', 'NODE_PATH', 'userAgent', 'taskPath');
    if (env.LANG == null) {
      env.LANG = systemLanguage;
    }
    env.TERM_PROGRAM = 'terminus';
    return env;
  })();

  module.exports = function(pwd, shell, args, env, options = {}) {
    var callback, emitTitle, ptyProcess, title;
    callback = this.async();
    if (shell) {
      ptyProcess = pty.fork(shell, args, {
        cwd: pwd,
        env: _.extend(filteredEnvironment, env),
        name: 'xterm-256color'
      });
      title = shell = path.basename(shell);
    } else {
      ptyProcess = pty.open();
    }
    emitTitle = _.throttle(function() {
      return emit('terminus:title', ptyProcess.process);
    }, 500, true);
    ptyProcess.on('data', function(data) {
      emit('terminus:data', data);
      return emitTitle();
    });
    ptyProcess.on('exit', function() {
      emit('terminus:exit');
      return callback();
    });
    return process.on('message', function({event, cols, rows, text} = {}) {
      switch (event) {
        case 'resize':
          return ptyProcess.resize(cols, rows);
        case 'input':
          return ptyProcess.write(text);
        case 'pty':
          return emit('terminus:pty', ptyProcess.pty);
      }
    });
  };

}).call(this);