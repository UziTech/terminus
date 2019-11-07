(function() {
  var CompositeDisposable, RenameDialog, StatusIcon;

  ({CompositeDisposable} = require('atom'));

  RenameDialog = null;

  module.exports = StatusIcon = (function() {
    class StatusIcon extends HTMLElement {
      initialize(terminalView) {
        var ref;
        this.terminalView = terminalView;
        this.classList.add('terminus-status-icon');
        this.icon = document.createElement('i');
        this.icon.classList.add('icon', 'icon-terminal');
        this.appendChild(this.icon);
        this.name = document.createElement('span');
        this.name.classList.add('name');
        this.appendChild(this.name);
        this.dataset.type = (ref = this.terminalView.constructor) != null ? ref.name : void 0;
        this.addEventListener('click', ({which, ctrlKey}) => {
          if (which === 1) {
            this.terminalView.toggle();
            return true;
          } else if (which === 2) {
            this.terminalView.destroy();
            return false;
          }
        });
        return this.setupTooltip();
      }

      setupTooltip() {
        var onMouseEnter;
        onMouseEnter = (event) => {
          if (event.detail === 'terminus') {
            return;
          }
          return this.updateTooltip();
        };
        this.mouseEnterSubscription = {
          dispose: () => {
            this.removeEventListener('mouseenter', onMouseEnter);
            return this.mouseEnterSubscription = null;
          }
        };
        return this.addEventListener('mouseenter', onMouseEnter);
      }

      updateTooltip() {
        var process;
        this.removeTooltip();
        if (process = this.terminalView.getTerminalTitle()) {
          this.tooltip = atom.tooltips.add(this, {
            title: process,
            html: false,
            delay: {
              show: 1000,
              hide: 100
            }
          });
        }
        return this.dispatchEvent(new CustomEvent('mouseenter', {
          bubbles: true,
          detail: 'terminus'
        }));
      }

      removeTooltip() {
        if (this.tooltip) {
          this.tooltip.dispose();
        }
        return this.tooltip = null;
      }

      destroy() {
        this.removeTooltip();
        if (this.mouseEnterSubscription) {
          this.mouseEnterSubscription.dispose();
        }
        return this.remove();
      }

      activate() {
        this.classList.add('active');
        return this.active = true;
      }

      isActive() {
        return this.classList.contains('active');
      }

      deactivate() {
        this.classList.remove('active');
        return this.active = false;
      }

      toggle() {
        if (this.active) {
          this.classList.remove('active');
        } else {
          this.classList.add('active');
        }
        return this.active = !this.active;
      }

      isActive() {
        return this.active;
      }

      rename() {
        var dialog;
        if (RenameDialog == null) {
          RenameDialog = require('./rename-dialog');
        }
        dialog = new RenameDialog(this);
        return dialog.attach();
      }

      getName() {
        return this.name.textContent.substring(1);
      }

      updateName(name) {
        if (name !== this.getName()) {
          if (name) {
            name = "&nbsp;" + name;
          }
          this.name.innerHTML = name;
          return this.terminalView.emit('did-change-title');
        }
      }

    };

    StatusIcon.prototype.active = false;

    return StatusIcon;

  }).call(this);

  module.exports = document.registerElement('terminus-status-icon', {
    prototype: StatusIcon.prototype,
    extends: 'li'
  });

}).call(this);