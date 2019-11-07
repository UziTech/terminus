(function() {
  var $, CompositeDisposable, StatusBar, StatusIcon, TerminusView, View, _, os, path,
    boundMethodCheck = function(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new Error('Bound instance method accessed before binding'); } };

  ({CompositeDisposable} = require('atom'));

  ({$, View} = require('atom-space-pen-views'));

  TerminusView = require('./view');

  StatusIcon = require('./status-icon');

  os = require('os');

  path = require('path');

  _ = require('underscore');

  module.exports = StatusBar = (function() {
    class StatusBar extends View {
      constructor() {
        super(...arguments);
        this.closeAll = this.closeAll.bind(this);
        this.onDragStart = this.onDragStart.bind(this);
        this.onDragLeave = this.onDragLeave.bind(this);
        this.onDragEnd = this.onDragEnd.bind(this);
        this.onDragOver = this.onDragOver.bind(this);
        this.onDrop = this.onDrop.bind(this);
        this.onDropTabBar = this.onDropTabBar.bind(this);
        this.moveTerminalView = this.moveTerminalView.bind(this);
      }

      static content() {
        return this.div({
          class: 'terminus status-bar',
          tabindex: -1
        }, () => {
          this.i({
            class: "icon icon-plus",
            click: 'newTerminalView',
            outlet: 'plusBtn'
          });
          this.ul({
            class: "list-inline status-container",
            tabindex: '-1',
            outlet: 'statusContainer',
            is: 'space-pen-ul'
          });
          return this.i({
            class: "icon icon-x",
            click: 'closeAll',
            outlet: 'closeBtn'
          });
        });
      }

      initialize(statusBarProvider) {
        var handleBlur, handleFocus;
        this.statusBarProvider = statusBarProvider;
        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.commands.add('atom-workspace', {
          'terminus:focus': () => {
            return this.focusTerminal();
          },
          'terminus:new': () => {
            return this.newTerminalView();
          },
          'terminus:toggle': () => {
            return this.toggle();
          },
          'terminus:next': () => {
            if (!this.activeTerminal) {
              return;
            }
            if (this.activeTerminal.isAnimating()) {
              return;
            }
            if (this.activeNextTerminalView()) {
              return this.activeTerminal.open();
            }
          },
          'terminus:prev': () => {
            if (!this.activeTerminal) {
              return;
            }
            if (this.activeTerminal.isAnimating()) {
              return;
            }
            if (this.activePrevTerminalView()) {
              return this.activeTerminal.open();
            }
          },
          'terminus:clear': () => {
            return this.clear();
          },
          'terminus:close': () => {
            return this.destroyActiveTerm();
          },
          'terminus:close-all': () => {
            return this.closeAll();
          },
          'terminus:rename': () => {
            return this.runInActiveView(function(i) {
              return i.rename();
            });
          },
          'terminus:insert-selected-text': () => {
            return this.runInActiveView(function(i) {
              return i.insertSelection('$S');
            });
          },
          'terminus:insert-text': () => {
            return this.runInActiveView(function(i) {
              return i.inputDialog();
            });
          },
          'terminus:insert-custom-text-1': () => {
            return this.runInActiveView(function(i) {
              return i.insertSelection(atom.config.get('terminus.customTexts.customText1'));
            });
          },
          'terminus:insert-custom-text-2': () => {
            return this.runInActiveView(function(i) {
              return i.insertSelection(atom.config.get('terminus.customTexts.customText2'));
            });
          },
          'terminus:insert-custom-text-3': () => {
            return this.runInActiveView(function(i) {
              return i.insertSelection(atom.config.get('terminus.customTexts.customText3'));
            });
          },
          'terminus:insert-custom-text-4': () => {
            return this.runInActiveView(function(i) {
              return i.insertSelection(atom.config.get('terminus.customTexts.customText4'));
            });
          },
          'terminus:insert-custom-text-5': () => {
            return this.runInActiveView(function(i) {
              return i.insertSelection(atom.config.get('terminus.customTexts.customText5'));
            });
          },
          'terminus:insert-custom-text-6': () => {
            return this.runInActiveView(function(i) {
              return i.insertSelection(atom.config.get('terminus.customTexts.customText6'));
            });
          },
          'terminus:insert-custom-text-7': () => {
            return this.runInActiveView(function(i) {
              return i.insertSelection(atom.config.get('terminus.customTexts.customText7'));
            });
          },
          'terminus:insert-custom-text-8': () => {
            return this.runInActiveView(function(i) {
              return i.insertSelection(atom.config.get('terminus.customTexts.customText8'));
            });
          },
          'terminus:fullscreen': () => {
            return this.activeTerminal.maximize();
          }
        }));
        this.subscriptions.add(atom.commands.add('.xterm', {
          'terminus:paste': () => {
            return this.runInActiveView(function(i) {
              return i.paste();
            });
          },
          'terminus:copy': () => {
            return this.runInActiveView(function(i) {
              return i.copy();
            });
          }
        }));
        this.subscriptions.add(atom.workspace.onDidChangeActivePaneItem((item) => {
          var mapping, nextTerminal, prevTerminal;
          if (item == null) {
            return;
          }
          if (item.constructor.name === "TerminusView") {
            return setTimeout(item.focus, 100);
          } else if (item.constructor.name === "TextEditor") {
            mapping = atom.config.get('terminus.core.mapTerminalsTo');
            if (mapping === 'None') {
              return;
            }
            if (!item.getPath()) {
              return;
            }
            switch (mapping) {
              case 'File':
                nextTerminal = this.getTerminalById(item.getPath(), function(view) {
                  return view.getId().filePath;
                });
                break;
              case 'Folder':
                nextTerminal = this.getTerminalById(path.dirname(item.getPath()), function(view) {
                  return view.getId().folderPath;
                });
            }
            prevTerminal = this.getActiveTerminalView();
            if (prevTerminal !== nextTerminal) {
              if (nextTerminal == null) {
                if (atom.config.get('terminus.core.mapTerminalsToAutoOpen')) {
                  return nextTerminal = this.createTerminalView();
                }
              } else {
                this.setActiveTerminalView(nextTerminal);
                if (prevTerminal != null ? prevTerminal.panel.isVisible() : void 0) {
                  return nextTerminal.toggle();
                }
              }
            }
          }
        }));
        this.registerContextMenu();
        this.subscriptions.add(atom.tooltips.add(this.plusBtn, {
          title: 'New Terminal'
        }));
        this.subscriptions.add(atom.tooltips.add(this.closeBtn, {
          title: 'Close All'
        }));
        this.statusContainer.on('dblclick', (event) => {
          if (event.target === event.delegateTarget) {
            return this.newTerminalView();
          }
        });
        this.statusContainer.on('dragstart', '.terminus-status-icon', this.onDragStart);
        this.statusContainer.on('dragend', '.terminus-status-icon', this.onDragEnd);
        this.statusContainer.on('dragleave', this.onDragLeave);
        this.statusContainer.on('dragover', this.onDragOver);
        this.statusContainer.on('drop', this.onDrop);
        handleBlur = () => {
          var terminal;
          if (terminal = TerminusView.getFocusedTerminal()) {
            this.returnFocus = this.terminalViewForTerminal(terminal);
            return terminal.blur();
          }
        };
        handleFocus = () => {
          if (this.returnFocus) {
            return setTimeout(() => {
              var ref;
              if ((ref = this.returnFocus) != null) {
                ref.focus(true);
              }
              return this.returnFocus = null;
            }, 100);
          }
        };
        window.addEventListener('blur', handleBlur);
        this.subscriptions.add({
          dispose: function() {
            return window.removeEventListener('blur', handleBlur);
          }
        });
        window.addEventListener('focus', handleFocus);
        this.subscriptions.add({
          dispose: function() {
            return window.removeEventListener('focus', handleFocus);
          }
        });
        return this.attach();
      }

      registerContextMenu() {
        return this.subscriptions.add(atom.commands.add('.terminus.status-bar', {
          'terminus:status-red': this.setStatusColor,
          'terminus:status-orange': this.setStatusColor,
          'terminus:status-yellow': this.setStatusColor,
          'terminus:status-green': this.setStatusColor,
          'terminus:status-blue': this.setStatusColor,
          'terminus:status-purple': this.setStatusColor,
          'terminus:status-pink': this.setStatusColor,
          'terminus:status-cyan': this.setStatusColor,
          'terminus:status-magenta': this.setStatusColor,
          'terminus:status-default': this.clearStatusColor,
          'terminus:context-close': function(event) {
            return $(event.target).closest('.terminus-status-icon')[0].terminalView.destroy();
          },
          'terminus:context-hide': function(event) {
            var statusIcon;
            statusIcon = $(event.target).closest('.terminus-status-icon')[0];
            if (statusIcon.isActive()) {
              return statusIcon.terminalView.hide();
            }
          },
          'terminus:context-rename': function(event) {
            return $(event.target).closest('.terminus-status-icon')[0].rename();
          }
        }));
      }

      registerPaneSubscription() {
        return this.subscriptions.add(this.paneSubscription = atom.workspace.observePanes((pane) => {
          var paneElement, tabBar;
          paneElement = $(atom.views.getView(pane));
          tabBar = paneElement.find('ul');
          tabBar.on('drop', (event) => {
            return this.onDropTabBar(event, pane);
          });
          tabBar.on('dragstart', function(event) {
            var ref;
            if (((ref = event.target.item) != null ? ref.constructor.name : void 0) !== 'TerminusView') {
              return;
            }
            return event.originalEvent.dataTransfer.setData('terminus-tab', 'true');
          });
          return pane.onDidDestroy(function() {
            return tabBar.off('drop', this.onDropTabBar);
          });
        }));
      }

      createTerminalView(autoRun) {
        var args, env, shell, shellArguments, shellEnv;
        shell = atom.config.get('terminus.core.shell');
        shellArguments = atom.config.get('terminus.core.shellArguments');
        args = shellArguments.split(/\s+/g).filter(function(arg) {
          return arg;
        });
        shellEnv = atom.config.get('terminus.core.shellEnv');
        env = {};
        shellEnv.split(' ').forEach((element) => {
          var configVar, envVar;
          configVar = element.split('=');
          envVar = {};
          envVar[configVar[0]] = configVar[1];
          return env = _.extend(env, envVar);
        });
        return this.createEmptyTerminalView(autoRun, shell, args, env);
      }

      createEmptyTerminalView(autoRun = [], shell = null, args = [], env = {}) {
        var directory, editorFolder, editorPath, home, id, j, len, projectFolder, pwd, ref, ref1, statusIcon, terminusView;
        if (this.paneSubscription == null) {
          this.registerPaneSubscription();
        }
        projectFolder = atom.project.getPaths()[0];
        editorPath = (ref = atom.workspace.getActiveTextEditor()) != null ? ref.getPath() : void 0;
        if (editorPath != null) {
          editorFolder = path.dirname(editorPath);
          ref1 = atom.project.getPaths();
          for (j = 0, len = ref1.length; j < len; j++) {
            directory = ref1[j];
            if (editorPath.indexOf(directory) >= 0) {
              projectFolder = directory;
            }
          }
        }
        if ((projectFolder != null ? projectFolder.indexOf('atom://') : void 0) >= 0) {
          projectFolder = void 0;
        }
        home = process.platform === 'win32' ? process.env.HOMEPATH : process.env.HOME;
        switch (atom.config.get('terminus.core.workingDirectory')) {
          case 'Project':
            pwd = projectFolder || editorFolder || home;
            break;
          case 'Active File':
            pwd = editorFolder || projectFolder || home;
            break;
          default:
            pwd = home;
        }
        id = editorPath || projectFolder || home;
        id = {
          filePath: id,
          folderPath: path.dirname(id)
        };
        statusIcon = new StatusIcon();
        terminusView = new TerminusView(id, pwd, statusIcon, this, shell, args, env, autoRun);
        statusIcon.initialize(terminusView);
        terminusView.attach();
        this.terminalViews.push(terminusView);
        this.statusContainer.append(statusIcon);
        return terminusView;
      }

      activeNextTerminalView() {
        var index;
        index = this.indexOf(this.activeTerminal);
        if (index < 0) {
          return false;
        }
        return this.activeTerminalView(index + 1);
      }

      activePrevTerminalView() {
        var index;
        index = this.indexOf(this.activeTerminal);
        if (index < 0) {
          return false;
        }
        return this.activeTerminalView(index - 1);
      }

      indexOf(view) {
        return this.terminalViews.indexOf(view);
      }

      activeTerminalView(index) {
        if (this.terminalViews.length < 2) {
          return false;
        }
        if (index >= this.terminalViews.length) {
          index = 0;
        }
        if (index < 0) {
          index = this.terminalViews.length - 1;
        }
        this.activeTerminal = this.terminalViews[index];
        return true;
      }

      getActiveTerminalView() {
        return this.activeTerminal;
      }

      focusTerminal() {
        var terminal;
        if (this.activeTerminal == null) {
          return;
        }
        if (terminal = TerminusView.getFocusedTerminal()) {
          return this.activeTerminal.blur();
        } else {
          return this.activeTerminal.focusTerminal();
        }
      }

      getTerminalById(target, selector) {
        var index, j, ref, terminal;
        if (selector == null) {
          selector = function(terminal) {
            return terminal.id;
          };
        }
        for (index = j = 0, ref = this.terminalViews.length; (0 <= ref ? j <= ref : j >= ref); index = 0 <= ref ? ++j : --j) {
          terminal = this.terminalViews[index];
          if (terminal != null) {
            if (selector(terminal) === target) {
              return terminal;
            }
          }
        }
        return null;
      }

      terminalViewForTerminal(terminal) {
        var index, j, ref, terminalView;
        for (index = j = 0, ref = this.terminalViews.length; (0 <= ref ? j <= ref : j >= ref); index = 0 <= ref ? ++j : --j) {
          terminalView = this.terminalViews[index];
          if (terminalView != null) {
            if (terminalView.getTerminal() === terminal) {
              return terminalView;
            }
          }
        }
        return null;
      }

      runInActiveView(callback) {
        var view;
        view = this.getActiveTerminalView();
        if (view != null) {
          return callback(view);
        }
        return null;
      }

      runNewTerminal() {
        this.activeTerminal = this.createEmptyTerminalView();
        this.activeTerminal.toggle();
        return this.activeTerminal;
      }

      runCommandInNewTerminal(commands) {
        this.activeTerminal = this.createTerminalView(commands);
        return this.activeTerminal.toggle();
      }

      runInOpenView(callback) {
        var view;
        view = this.getActiveTerminalView();
        if ((view != null) && view.panel.isVisible()) {
          return callback(view);
        }
        return null;
      }

      setActiveTerminalView(view) {
        return this.activeTerminal = view;
      }

      removeTerminalView(view) {
        var index;
        index = this.indexOf(view);
        if (index < 0) {
          return;
        }
        this.terminalViews.splice(index, 1);
        return this.activateAdjacentTerminal(index);
      }

      activateAdjacentTerminal(index = 0) {
        if (!(this.terminalViews.length > 0)) {
          return false;
        }
        index = Math.max(0, index - 1);
        this.activeTerminal = this.terminalViews[index];
        return true;
      }

      newTerminalView() {
        var ref;
        if ((ref = this.activeTerminal) != null ? ref.animating : void 0) {
          return;
        }
        this.activeTerminal = this.createTerminalView();
        return this.activeTerminal.toggle();
      }

      attach() {
        return this.statusBarProvider.addLeftTile({
          item: this,
          priority: -93
        });
      }

      destroyActiveTerm() {
        var index;
        if (this.activeTerminal == null) {
          return;
        }
        index = this.indexOf(this.activeTerminal);
        this.activeTerminal.destroy();
        this.activeTerminal = null;
        return this.activateAdjacentTerminal(index);
      }

      closeAll() {
        var index, j, ref, view;
        boundMethodCheck(this, StatusBar);
        for (index = j = ref = this.terminalViews.length; (ref <= 0 ? j <= 0 : j >= 0); index = ref <= 0 ? ++j : --j) {
          view = this.terminalViews[index];
          if (view != null) {
            view.destroy();
          }
        }
        return this.activeTerminal = null;
      }

      destroy() {
        var j, len, ref, view;
        this.subscriptions.dispose();
        ref = this.terminalViews;
        for (j = 0, len = ref.length; j < len; j++) {
          view = ref[j];
          view.ptyProcess.terminate();
          view.terminal.destroy();
        }
        return this.detach();
      }

      toggle() {
        if (this.terminalViews.length === 0) {
          this.activeTerminal = this.createTerminalView();
        } else if (this.activeTerminal === null) {
          this.activeTerminal = this.terminalViews[0];
        }
        return this.activeTerminal.toggle();
      }

      clear() {
        this.destroyActiveTerm();
        return this.newTerminalView();
      }

      setStatusColor(event) {
        var color;
        color = event.type.match(/\w+$/)[0];
        color = atom.config.get(`terminus.iconColors.${color}`).toRGBAString();
        return $(event.target).closest('.terminus-status-icon').css('color', color);
      }

      clearStatusColor(event) {
        return $(event.target).closest('.terminus-status-icon').css('color', '');
      }

      onDragStart(event) {
        var element;
        boundMethodCheck(this, StatusBar);
        event.originalEvent.dataTransfer.setData('terminus-panel', 'true');
        element = $(event.target).closest('.terminus-status-icon');
        element.addClass('is-dragging');
        return event.originalEvent.dataTransfer.setData('from-index', element.index());
      }

      onDragLeave(event) {
        boundMethodCheck(this, StatusBar);
        return this.removePlaceholder();
      }

      onDragEnd(event) {
        boundMethodCheck(this, StatusBar);
        return this.clearDropTarget();
      }

      onDragOver(event) {
        var element, newDropTargetIndex, statusIcons;
        boundMethodCheck(this, StatusBar);
        event.preventDefault();
        event.stopPropagation();
        if (event.originalEvent.dataTransfer.getData('terminus') !== 'true') {
          return;
        }
        newDropTargetIndex = this.getDropTargetIndex(event);
        if (newDropTargetIndex == null) {
          return;
        }
        this.removeDropTargetClasses();
        statusIcons = this.statusContainer.children('.terminus-status-icon');
        if (newDropTargetIndex < statusIcons.length) {
          element = statusIcons.eq(newDropTargetIndex).addClass('is-drop-target');
          return this.getPlaceholder().insertBefore(element);
        } else {
          element = statusIcons.eq(newDropTargetIndex - 1).addClass('drop-target-is-after');
          return this.getPlaceholder().insertAfter(element);
        }
      }

      onDrop(event) {
        var dataTransfer, fromIndex, pane, paneIndex, panelEvent, tabEvent, toIndex, view;
        boundMethodCheck(this, StatusBar);
        ({dataTransfer} = event.originalEvent);
        panelEvent = dataTransfer.getData('terminus-panel') === 'true';
        tabEvent = dataTransfer.getData('terminus-tab') === 'true';
        if (!(panelEvent || tabEvent)) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        toIndex = this.getDropTargetIndex(event);
        this.clearDropTarget();
        if (tabEvent) {
          fromIndex = parseInt(dataTransfer.getData('sortable-index'));
          paneIndex = parseInt(dataTransfer.getData('from-pane-index'));
          pane = atom.workspace.getPanes()[paneIndex];
          view = pane.itemAtIndex(fromIndex);
          pane.removeItem(view, false);
          view.show();
          view.toggleTabView();
          this.terminalViews.push(view);
          if (view.statusIcon.isActive()) {
            view.open();
          }
          this.statusContainer.append(view.statusIcon);
          fromIndex = this.terminalViews.length - 1;
        } else {
          fromIndex = parseInt(dataTransfer.getData('from-index'));
        }
        return this.updateOrder(fromIndex, toIndex);
      }

      onDropTabBar(event, pane) {
        var dataTransfer, fromIndex, tabBar, view;
        boundMethodCheck(this, StatusBar);
        ({dataTransfer} = event.originalEvent);
        if (dataTransfer.getData('terminus-panel') !== 'true') {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.clearDropTarget();
        fromIndex = parseInt(dataTransfer.getData('from-index'));
        view = this.terminalViews[fromIndex];
        view.css("height", "");
        view.terminal.element.style.height = "";
        tabBar = $(event.target).closest('.tab-bar');
        view.toggleTabView();
        this.removeTerminalView(view);
        this.statusContainer.children().eq(fromIndex).detach();
        view.statusIcon.removeTooltip();
        pane.addItem(view, pane.getItems().length);
        pane.activateItem(view);
        return view.focus();
      }

      clearDropTarget() {
        var element;
        element = this.find('.is-dragging');
        element.removeClass('is-dragging');
        this.removeDropTargetClasses();
        return this.removePlaceholder();
      }

      removeDropTargetClasses() {
        this.statusContainer.find('.is-drop-target').removeClass('is-drop-target');
        return this.statusContainer.find('.drop-target-is-after').removeClass('drop-target-is-after');
      }

      getDropTargetIndex(event) {
        var element, elementCenter, statusIcons, target;
        target = $(event.target);
        if (this.isPlaceholder(target)) {
          return;
        }
        statusIcons = this.statusContainer.children('.terminus-status-icon');
        element = target.closest('.terminus-status-icon');
        if (element.length === 0) {
          element = statusIcons.last();
        }
        if (!element.length) {
          return 0;
        }
        elementCenter = element.offset().left + element.width() / 2;
        if (event.originalEvent.pageX < elementCenter) {
          return statusIcons.index(element);
        } else if (element.next('.terminus-status-icon').length > 0) {
          return statusIcons.index(element.next('.terminus-status-icon'));
        } else {
          return statusIcons.index(element) + 1;
        }
      }

      getPlaceholder() {
        return this.placeholderEl != null ? this.placeholderEl : this.placeholderEl = $('<li class="placeholder"></li>');
      }

      removePlaceholder() {
        var ref;
        if ((ref = this.placeholderEl) != null) {
          ref.remove();
        }
        return this.placeholderEl = null;
      }

      isPlaceholder(element) {
        return element.is('.placeholder');
      }

      iconAtIndex(index) {
        return this.getStatusIcons().eq(index);
      }

      getStatusIcons() {
        return this.statusContainer.children('.terminus-status-icon');
      }

      moveIconToIndex(icon, toIndex) {
        var container, followingIcon;
        followingIcon = this.getStatusIcons()[toIndex];
        container = this.statusContainer[0];
        if (followingIcon != null) {
          return container.insertBefore(icon, followingIcon);
        } else {
          return container.appendChild(icon);
        }
      }

      moveTerminalView(fromIndex, toIndex) {
        var activeTerminal, view;
        boundMethodCheck(this, StatusBar);
        activeTerminal = this.getActiveTerminalView();
        view = this.terminalViews.splice(fromIndex, 1)[0];
        this.terminalViews.splice(toIndex, 0, view);
        return this.setActiveTerminalView(activeTerminal);
      }

      updateOrder(fromIndex, toIndex) {
        var icon;
        if (fromIndex === toIndex) {
          return;
        }
        if (fromIndex < toIndex) {
          toIndex--;
        }
        icon = this.getStatusIcons().eq(fromIndex).detach();
        this.moveIconToIndex(icon.get(0), toIndex);
        this.moveTerminalView(fromIndex, toIndex);
        icon.addClass('inserted');
        return icon.one('webkitAnimationEnd', function() {
          return icon.removeClass('inserted');
        });
      }

    };

    StatusBar.prototype.terminalViews = [];

    StatusBar.prototype.activeTerminal = null;

    StatusBar.prototype.returnFocus = null;

    return StatusBar;

  }).call(this);

}).call(this);