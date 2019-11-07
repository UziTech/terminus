(function() {
  var $, CompositeDisposable, Emitter, InputDialog, Pty, Task, Terminal, TerminusView, View, lastActiveElement, lastOpenedView, os, path,
    boundMethodCheck = function(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new Error('Bound instance method accessed before binding'); } },
    splice = [].splice;

  ({Task, CompositeDisposable, Emitter} = require('atom'));

  ({$, View} = require('atom-space-pen-views'));

  Pty = require.resolve('./process');

  Terminal = require('term.js');

  InputDialog = null;

  path = require('path');

  os = require('os');

  lastOpenedView = null;

  lastActiveElement = null;

  module.exports = TerminusView = (function() {
    class TerminusView extends View {
      constructor() {
        super(...arguments);
        this.setAnimationSpeed = this.setAnimationSpeed.bind(this);
        this.updateToolbarVisibility = this.updateToolbarVisibility.bind(this);
        this.recieveItemOrFile = this.recieveItemOrFile.bind(this);
        this.open = this.open.bind(this);
        this.hide = this.hide.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        this.resizeStarted = this.resizeStarted.bind(this);
        this.resizeStopped = this.resizeStopped.bind(this);
        this.resizePanel = this.resizePanel.bind(this);
        this.focus = this.focus.bind(this);
        this.blur = this.blur.bind(this);
        this.focusTerminal = this.focusTerminal.bind(this);
        this.blurTerminal = this.blurTerminal.bind(this);
      }

      static content() {
        return this.div({
          class: 'terminus terminal-view',
          outlet: 'terminusView'
        }, () => {
          this.div({
            class: 'panel-divider',
            outlet: 'panelDivider'
          });
          this.section({
            class: 'input-block'
          }, () => {
            return this.div({
              outlet: 'toolbar',
              class: 'btn-toolbar'
            }, () => {
              this.div({
                class: 'btn-group'
              }, () => {
                return this.button({
                  outlet: 'inputBtn',
                  class: 'btn icon icon-keyboard',
                  click: 'inputDialog'
                });
              });
              return this.div({
                class: 'btn-group right'
              }, () => {
                this.button({
                  outlet: 'hideBtn',
                  class: 'btn icon icon-chevron-down',
                  click: 'hide'
                });
                this.button({
                  outlet: 'maximizeBtn',
                  class: 'btn icon icon-screen-full',
                  click: 'maximize'
                });
                return this.button({
                  outlet: 'closeBtn',
                  class: 'btn icon icon-x',
                  click: 'destroy'
                });
              });
            });
          });
          return this.div({
            class: 'xterm',
            outlet: 'xterm'
          });
        });
      }

      static getFocusedTerminal() {
        return Terminal.Terminal.focus;
      }

      initialize(id, pwd, statusIcon, statusBar, shell, args = [], env = {}, autoRun = []) {
        var bottomHeight, override, percent;
        this.id = id;
        this.pwd = pwd;
        this.statusIcon = statusIcon;
        this.statusBar = statusBar;
        this.shell = shell;
        this.args = args;
        this.env = env;
        this.autoRun = autoRun;
        this.subscriptions = new CompositeDisposable;
        this.emitter = new Emitter;
        this.subscriptions.add(atom.tooltips.add(this.closeBtn, {
          title: 'Close'
        }));
        this.subscriptions.add(atom.tooltips.add(this.hideBtn, {
          title: 'Hide'
        }));
        this.subscriptions.add(this.maximizeBtn.tooltip = atom.tooltips.add(this.maximizeBtn, {
          title: 'Fullscreen'
        }));
        this.inputBtn.tooltip = atom.tooltips.add(this.inputBtn, {
          title: 'Insert Text'
        });
        this.prevHeight = atom.config.get('terminus.style.defaultPanelHeight');
        if (this.prevHeight.indexOf('%') > 0) {
          percent = Math.abs(Math.min(parseFloat(this.prevHeight) / 100.0, 1));
          bottomHeight = $('atom-panel.bottom').children(".terminal-view").height() || 0;
          this.prevHeight = percent * ($('.item-views').height() + bottomHeight);
        }
        this.xterm.height(0);
        this.setAnimationSpeed();
        this.subscriptions.add(atom.config.onDidChange('terminus.style.animationSpeed', this.setAnimationSpeed));
        this.updateToolbarVisibility();
        this.subscriptions.add(atom.config.onDidChange('terminus.toggles.showToolbar', this.updateToolbarVisibility));
        override = function(event) {
          if (event.originalEvent.dataTransfer.getData('terminus') === 'true') {
            return;
          }
          event.preventDefault();
          return event.stopPropagation();
        };
        this.xterm.on('mouseup', (event) => {
          var lines, rawLines, text;
          if (event.which !== 3) {
            text = window.getSelection().toString();
            if (atom.config.get('terminus.toggles.selectToCopy') && text) {
              rawLines = text.split(/\r?\n/g);
              lines = rawLines.map(function(line) {
                return line.replace(/\s/g, " ").trimRight();
              });
              text = lines.join("\n");
              atom.clipboard.write(text);
            }
            if (!text) {
              return this.focus();
            }
          }
        });
        this.xterm.on('dragenter', override);
        this.xterm.on('dragover', override);
        this.xterm.on('drop', this.recieveItemOrFile);
        this.on('focus', this.focus);
        this.subscriptions.add({
          dispose: () => {
            return this.off('focus', this.focus);
          }
        });
        if (/zsh|bash/.test(this.shell) && this.args.indexOf('--login') === -1 && Pty.platform !== 'win32' && atom.config.get('terminus.toggles.loginShell')) {
          return this.args.unshift('--login');
        }
      }

      attach() {
        if (this.panel != null) {
          return;
        }
        return this.panel = atom.workspace.addBottomPanel({
          item: this,
          visible: false
        });
      }

      setAnimationSpeed() {
        boundMethodCheck(this, TerminusView);
        this.animationSpeed = atom.config.get('terminus.style.animationSpeed');
        if (this.animationSpeed === 0) {
          this.animationSpeed = 100;
        }
        return this.xterm.css('transition', `height ${0.25 / this.animationSpeed}s linear`);
      }

      updateToolbarVisibility() {
        boundMethodCheck(this, TerminusView);
        this.showToolbar = atom.config.get('terminus.toggles.showToolbar');
        if (this.showToolbar) {
          return this.toolbar.css('display', 'block');
        } else {
          return this.toolbar.css('display', 'none');
        }
      }

      recieveItemOrFile(event) {
        var dataTransfer, file, filePath, i, len, ref, results;
        boundMethodCheck(this, TerminusView);
        event.preventDefault();
        event.stopPropagation();
        ({dataTransfer} = event.originalEvent);
        if (dataTransfer.getData('atom-event') === 'true') {
          filePath = dataTransfer.getData('text/plain');
          if (filePath) {
            return this.input(`${filePath} `);
          }
        } else if (filePath = dataTransfer.getData('initialPath')) {
          return this.input(`${filePath} `);
        } else if (dataTransfer.files.length > 0) {
          ref = dataTransfer.files;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            file = ref[i];
            results.push(this.input(`${file.path} `));
          }
          return results;
        }
      }

      forkPtyProcess() {
        return Task.once(Pty, path.resolve(this.pwd), this.shell, this.args, this.env, () => {
          this.input = function() {};
          return this.resize = function() {};
        });
      }

      getId() {
        return this.id;
      }

      displayTerminal() {
        var cols, rows;
        ({cols, rows} = this.getDimensions());
        this.ptyProcess = this.forkPtyProcess();
        this.terminal = new Terminal({
          cursorBlink: false,
          scrollback: atom.config.get('terminus.core.scrollback'),
          cols,
          rows
        });
        this.attachListeners();
        this.attachResizeEvents();
        this.attachWindowEvents();
        return this.terminal.open(this.xterm.get(0));
      }

      attachListeners() {
        this.ptyProcess.on("terminus:data", (data) => {
          return this.terminal.write(data);
        });
        this.ptyProcess.on("terminus:exit", () => {
          if (atom.config.get('terminus.toggles.autoClose')) {
            return this.destroy();
          }
        });
        this.terminal.end = () => {
          return this.destroy();
        };
        this.terminal.on("data", (data) => {
          return this.input(data);
        });
        this.ptyProcess.on("terminus:title", (title) => {
          return this.process = title;
        });
        this.terminal.on("title", (title) => {
          return this.title = title;
        });
        return this.terminal.once("open", () => {
          var autoRunCommand, command, i, len, ref, results;
          this.applyStyle();
          this.resizeTerminalToView();
          if (this.ptyProcess.childProcess == null) {
            return;
          }
          autoRunCommand = atom.config.get('terminus.core.autoRunCommand');
          if (autoRunCommand) {
            this.input(`${autoRunCommand}${os.EOL}`);
          }
          ref = this.autoRun;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            command = ref[i];
            results.push(this.input(`${command}${os.EOL}`));
          }
          return results;
        });
      }

      destroy() {
        var ref, ref1;
        this.subscriptions.dispose();
        this.statusIcon.destroy();
        this.statusBar.removeTerminalView(this);
        this.detachResizeEvents();
        this.detachWindowEvents();
        if (this.panel.isVisible()) {
          this.hide();
          this.onTransitionEnd(() => {
            return this.panel.destroy();
          });
        } else {
          this.panel.destroy();
        }
        if (this.statusIcon && this.statusIcon.parentNode) {
          this.statusIcon.parentNode.removeChild(this.statusIcon);
        }
        if ((ref = this.ptyProcess) != null) {
          ref.terminate();
        }
        return (ref1 = this.terminal) != null ? ref1.destroy() : void 0;
      }

      maximize() {
        var btn;
        this.subscriptions.remove(this.maximizeBtn.tooltip);
        this.maximizeBtn.tooltip.dispose();
        this.maxHeight = this.prevHeight + atom.workspace.getCenter().paneContainer.element.offsetHeight;
        btn = this.maximizeBtn.children('span');
        this.onTransitionEnd(() => {
          return this.focus();
        });
        if (this.maximized) {
          this.maximizeBtn.tooltip = atom.tooltips.add(this.maximizeBtn, {
            title: 'Fullscreen'
          });
          this.subscriptions.add(this.maximizeBtn.tooltip);
          this.adjustHeight(this.prevHeight);
          btn.removeClass('icon-screen-normal').addClass('icon-screen-full');
          return this.maximized = false;
        } else {
          this.maximizeBtn.tooltip = atom.tooltips.add(this.maximizeBtn, {
            title: 'Normal'
          });
          this.subscriptions.add(this.maximizeBtn.tooltip);
          this.adjustHeight(this.maxHeight);
          btn.removeClass('icon-screen-full').addClass('icon-screen-normal');
          return this.maximized = true;
        }
      }

      open() {
        var icon;
        boundMethodCheck(this, TerminusView);
        if (lastActiveElement == null) {
          lastActiveElement = $(document.activeElement);
        }
        if (lastOpenedView && lastOpenedView !== this) {
          if (lastOpenedView.maximized) {
            this.subscriptions.remove(this.maximizeBtn.tooltip);
            this.maximizeBtn.tooltip.dispose();
            icon = this.maximizeBtn.children('span');
            this.maxHeight = lastOpenedView.maxHeight;
            this.maximizeBtn.tooltip = atom.tooltips.add(this.maximizeBtn, {
              title: 'Normal'
            });
            this.subscriptions.add(this.maximizeBtn.tooltip);
            icon.removeClass('icon-screen-full').addClass('icon-screen-normal');
            this.maximized = true;
          }
          lastOpenedView.hide();
        }
        lastOpenedView = this;
        this.statusBar.setActiveTerminalView(this);
        this.statusIcon.activate();
        this.onTransitionEnd(() => {
          if (!this.opened) {
            this.opened = true;
            this.displayTerminal();
            this.prevHeight = this.nearestRow(this.xterm.height());
            this.xterm.height(this.prevHeight);
            return this.emit("terminus:terminal-open");
          } else {
            return this.focus();
          }
        });
        this.panel.show();
        this.xterm.height(0);
        this.animating = true;
        return this.xterm.height(this.maximized ? this.maxHeight : this.prevHeight);
      }

      hide() {
        var ref;
        boundMethodCheck(this, TerminusView);
        if ((ref = this.terminal) != null) {
          ref.blur();
        }
        lastOpenedView = null;
        this.statusIcon.deactivate();
        this.onTransitionEnd(() => {
          this.panel.hide();
          if (lastOpenedView == null) {
            if (lastActiveElement != null) {
              lastActiveElement.focus();
              return lastActiveElement = null;
            }
          }
        });
        this.xterm.height(this.maximized ? this.maxHeight : this.prevHeight);
        this.animating = true;
        return this.xterm.height(0);
      }

      toggle() {
        if (this.animating) {
          return;
        }
        if (this.panel.isVisible()) {
          return this.hide();
        } else {
          return this.open();
        }
      }

      input(data) {
        if (this.ptyProcess.childProcess == null) {
          return;
        }
        this.terminal.stopScrolling();
        return this.ptyProcess.send({
          event: 'input',
          text: data
        });
      }

      resize(cols, rows) {
        if (this.ptyProcess.childProcess == null) {
          return;
        }
        return this.ptyProcess.send({
          event: 'resize',
          rows,
          cols
        });
      }

      pty() {
        var wait;
        if (!this.opened) {
          wait = new Promise((resolve, reject) => {
            this.emitter.on("terminus:terminal-open", () => {
              return resolve();
            });
            return setTimeout(reject, 1000);
          });
          return wait.then(() => {
            return this.ptyPromise();
          });
        } else {
          return this.ptyPromise();
        }
      }

      ptyPromise() {
        return new Promise((resolve, reject) => {
          if (this.ptyProcess != null) {
            this.ptyProcess.on("terminus:pty", (pty) => {
              return resolve(pty);
            });
            this.ptyProcess.send({
              event: 'pty'
            });
            return setTimeout(reject, 1000);
          } else {
            return reject();
          }
        });
      }

      applyStyle() {
        var config, defaultFont, editorFont, editorFontSize, overrideFont, overrideFontSize, ref, ref1;
        config = atom.config.get('terminus');
        this.xterm.addClass(config.style.theme);
        this.subscriptions.add(atom.config.onDidChange('terminus.style.theme', (event) => {
          this.xterm.removeClass(event.oldValue);
          return this.xterm.addClass(event.newValue);
        }));
        if (config.toggles.cursorBlink) {
          this.xterm.addClass('cursor-blink');
        }
        editorFont = atom.config.get('editor.fontFamily');
        defaultFont = "Menlo, Consolas, 'DejaVu Sans Mono', monospace";
        overrideFont = config.style.fontFamily;
        this.terminal.element.style.fontFamily = overrideFont || editorFont || defaultFont;
        this.subscriptions.add(atom.config.onDidChange('editor.fontFamily', (event) => {
          editorFont = event.newValue;
          return this.terminal.element.style.fontFamily = overrideFont || editorFont || defaultFont;
        }));
        this.subscriptions.add(atom.config.onDidChange('terminus.style.fontFamily', (event) => {
          overrideFont = event.newValue;
          return this.terminal.element.style.fontFamily = overrideFont || editorFont || defaultFont;
        }));
        editorFontSize = atom.config.get('editor.fontSize');
        overrideFontSize = config.style.fontSize;
        this.terminal.element.style.fontSize = `${overrideFontSize || editorFontSize}px`;
        this.subscriptions.add(atom.config.onDidChange('editor.fontSize', (event) => {
          editorFontSize = event.newValue;
          this.terminal.element.style.fontSize = `${overrideFontSize || editorFontSize}px`;
          return this.resizeTerminalToView();
        }));
        this.subscriptions.add(atom.config.onDidChange('terminus.style.fontSize', (event) => {
          overrideFontSize = event.newValue;
          this.terminal.element.style.fontSize = `${overrideFontSize || editorFontSize}px`;
          return this.resizeTerminalToView();
        }));
        splice.apply(this.terminal.colors, [0, 8].concat(ref = [config.ansiColors.normal.black.toHexString(), config.ansiColors.normal.red.toHexString(), config.ansiColors.normal.green.toHexString(), config.ansiColors.normal.yellow.toHexString(), config.ansiColors.normal.blue.toHexString(), config.ansiColors.normal.magenta.toHexString(), config.ansiColors.normal.cyan.toHexString(), config.ansiColors.normal.white.toHexString()])), ref;
        return (splice.apply(this.terminal.colors, [8, 8].concat(ref1 = [config.ansiColors.zBright.brightBlack.toHexString(), config.ansiColors.zBright.brightRed.toHexString(), config.ansiColors.zBright.brightGreen.toHexString(), config.ansiColors.zBright.brightYellow.toHexString(), config.ansiColors.zBright.brightBlue.toHexString(), config.ansiColors.zBright.brightMagenta.toHexString(), config.ansiColors.zBright.brightCyan.toHexString(), config.ansiColors.zBright.brightWhite.toHexString()])), ref1);
      }

      attachWindowEvents() {
        return $(window).on('resize', this.onWindowResize);
      }

      detachWindowEvents() {
        return $(window).off('resize', this.onWindowResize);
      }

      attachResizeEvents() {
        return this.panelDivider.on('mousedown', this.resizeStarted);
      }

      detachResizeEvents() {
        return this.panelDivider.off('mousedown');
      }

      onWindowResize() {
        var bottomPanel, clamped, delta, newHeight, overflow;
        boundMethodCheck(this, TerminusView);
        if (!this.tabView) {
          this.xterm.css('transition', '');
          newHeight = $(window).height();
          bottomPanel = $('atom-panel-container.bottom').first().get(0);
          overflow = bottomPanel.scrollHeight - bottomPanel.offsetHeight;
          delta = newHeight - this.windowHeight;
          this.windowHeight = newHeight;
          if (this.maximized) {
            clamped = Math.max(this.maxHeight + delta, this.rowHeight);
            if (this.panel.isVisible()) {
              this.adjustHeight(clamped);
            }
            this.maxHeight = clamped;
            this.prevHeight = Math.min(this.prevHeight, this.maxHeight);
          } else if (overflow > 0) {
            clamped = Math.max(this.nearestRow(this.prevHeight + delta), this.rowHeight);
            if (this.panel.isVisible()) {
              this.adjustHeight(clamped);
            }
            this.prevHeight = clamped;
          }
          this.xterm.css('transition', `height ${0.25 / this.animationSpeed}s linear`);
        }
        return this.resizeTerminalToView();
      }

      resizeStarted() {
        boundMethodCheck(this, TerminusView);
        if (this.maximized) {
          return;
        }
        this.maxHeight = this.prevHeight + $('.item-views').height();
        $(document).on('mousemove', this.resizePanel);
        $(document).on('mouseup', this.resizeStopped);
        return this.xterm.css('transition', '');
      }

      resizeStopped() {
        boundMethodCheck(this, TerminusView);
        $(document).off('mousemove', this.resizePanel);
        $(document).off('mouseup', this.resizeStopped);
        return this.xterm.css('transition', `height ${0.25 / this.animationSpeed}s linear`);
      }

      nearestRow(value) {
        var rows;
        rows = Math.floor(value / this.rowHeight);
        return rows * this.rowHeight;
      }

      resizePanel(event) {
        var clamped, delta, mouseY;
        boundMethodCheck(this, TerminusView);
        if (event.which !== 1) {
          return this.resizeStopped();
        }
        mouseY = $(window).height() - event.pageY;
        delta = mouseY - $('atom-panel-container.bottom').height() - $('atom-panel-container.footer').height();
        if (!(Math.abs(delta) > (this.rowHeight * 5 / 6))) {
          return;
        }
        clamped = Math.max(this.nearestRow(this.prevHeight + delta), this.rowHeight);
        if (clamped > this.maxHeight) {
          return;
        }
        this.xterm.height(clamped);
        $(this.terminal.element).height(clamped);
        this.prevHeight = clamped;
        return this.resizeTerminalToView();
      }

      adjustHeight(height) {
        this.xterm.height(height);
        return $(this.terminal.element).height(height);
      }

      copy() {
        var lines, rawLines, rawText, text, textarea;
        if (this.terminal._selected) {
          textarea = this.terminal.getCopyTextarea();
          text = this.terminal.grabText(this.terminal._selected.x1, this.terminal._selected.x2, this.terminal._selected.y1, this.terminal._selected.y2);
        } else {
          rawText = this.terminal.context.getSelection().toString();
          rawLines = rawText.split(/\r?\n/g);
          lines = rawLines.map(function(line) {
            return line.replace(/\s/g, " ").trimRight();
          });
          text = lines.join("\n");
        }
        return atom.clipboard.write(text);
      }

      paste() {
        return this.input(atom.clipboard.read());
      }

      insertSelection(customText) {
        var cursor, editor, line, runCommand, selection, selectionText;
        if (!(editor = atom.workspace.getActiveTextEditor())) {
          return;
        }
        runCommand = atom.config.get('terminus.toggles.runInsertedText');
        selectionText = '';
        if (selection = editor.getSelectedText()) {
          this.terminal.stopScrolling();
          selectionText = selection;
        } else if (cursor = editor.getCursorBufferPosition()) {
          line = editor.lineTextForBufferRow(cursor.row);
          this.terminal.stopScrolling();
          selectionText = line;
          editor.moveDown(1);
        }
        return this.input(`${customText.replace(/\$L/, `${editor.getCursorBufferPosition().row + 1}`).replace(/\$F/, path.basename(editor.buffer.getPath() ? editor.buffer.getPath() : '.')).replace(/\$D/, path.dirname(editor.buffer.getPath() ? editor.buffer.getPath() : '.')).replace(/\$S/, selectionText).replace(/\$\$/, '$')}${(runCommand ? os.EOL : '')}`);
      }

      focus(fromWindowEvent) {
        boundMethodCheck(this, TerminusView);
        this.resizeTerminalToView();
        this.focusTerminal(fromWindowEvent);
        this.statusBar.setActiveTerminalView(this);
        return super.focus();
      }

      blur() {
        boundMethodCheck(this, TerminusView);
        this.blurTerminal();
        return super.blur();
      }

      focusTerminal(fromWindowEvent) {
        boundMethodCheck(this, TerminusView);
        if (!this.terminal) {
          return;
        }
        lastActiveElement = $(document.activeElement);
        if (fromWindowEvent && !(lastActiveElement.is('div.terminal') || lastActiveElement.parents('div.terminal').length)) {
          return;
        }
        this.terminal.focus();
        if (this.terminal._textarea) {
          return this.terminal._textarea.focus();
        } else {
          return this.terminal.element.focus();
        }
      }

      blurTerminal() {
        boundMethodCheck(this, TerminusView);
        if (!this.terminal) {
          return;
        }
        this.terminal.blur();
        this.terminal.element.blur();
        if (lastActiveElement != null) {
          return lastActiveElement.focus();
        }
      }

      resizeTerminalToView() {
        var cols, rows;
        if (!(this.panel.isVisible() || this.tabView)) {
          return;
        }
        ({cols, rows} = this.getDimensions());
        if (!(cols > 0 && rows > 0)) {
          return;
        }
        if (!this.terminal) {
          return;
        }
        if (this.terminal.rows === rows && this.terminal.cols === cols) {
          return;
        }
        this.resize(cols, rows);
        return this.terminal.resize(cols, rows);
      }

      getDimensions() {
        var cols, fakeCol, fakeRow, rows;
        fakeRow = $("<div><span>&nbsp;</span></div>");
        if (this.terminal) {
          this.find('.terminal').append(fakeRow);
          fakeCol = fakeRow.children().first()[0].getBoundingClientRect();
          cols = Math.floor(this.xterm.width() / (fakeCol.width || 9));
          rows = Math.floor(this.xterm.height() / (fakeCol.height || 20));
          this.rowHeight = fakeCol.height;
          fakeRow.remove();
        } else {
          cols = Math.floor(this.xterm.width() / 9);
          rows = Math.floor(this.xterm.height() / 20);
        }
        return {cols, rows};
      }

      onTransitionEnd(callback) {
        return this.xterm.one('webkitTransitionEnd', () => {
          callback();
          return this.animating = false;
        });
      }

      inputDialog() {
        var dialog;
        if (InputDialog == null) {
          InputDialog = require('./input-dialog');
        }
        dialog = new InputDialog(this);
        return dialog.attach();
      }

      rename() {
        return this.statusIcon.rename();
      }

      toggleTabView() {
        if (this.tabView) {
          this.panel = atom.workspace.addBottomPanel({
            item: this,
            visible: false
          });
          this.attachResizeEvents();
          this.closeBtn.show();
          this.hideBtn.show();
          this.maximizeBtn.show();
          return this.tabView = false;
        } else {
          this.panel.destroy();
          this.detachResizeEvents();
          this.closeBtn.hide();
          this.hideBtn.hide();
          this.maximizeBtn.hide();
          this.xterm.css("height", "");
          this.tabView = true;
          if (lastOpenedView === this) {
            return lastOpenedView = null;
          }
        }
      }

      getTitle() {
        return this.statusIcon.getName() || "terminus";
      }

      getIconName() {
        return "terminal";
      }

      getShell() {
        return path.basename(this.shell);
      }

      getShellPath() {
        return this.shell;
      }

      emit(event, data) {
        return this.emitter.emit(event, data);
      }

      onDidChangeTitle(callback) {
        return this.emitter.on('did-change-title', callback);
      }

      getPath() {
        return this.getTerminalTitle();
      }

      getTerminalTitle() {
        return this.title || this.process;
      }

      getTerminal() {
        return this.terminal;
      }

      isAnimating() {
        return this.animating;
      }

    };

    TerminusView.prototype.animating = false;

    TerminusView.prototype.id = '';

    TerminusView.prototype.maximized = false;

    TerminusView.prototype.opened = false;

    TerminusView.prototype.pwd = '';

    TerminusView.prototype.windowHeight = $(window).height();

    TerminusView.prototype.rowHeight = 20;

    TerminusView.prototype.shell = '';

    TerminusView.prototype.tabView = false;

    return TerminusView;

  }).call(this);

}).call(this);