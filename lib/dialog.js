(function() {
  var Dialog, TextEditorView, View;

  ({TextEditorView, View} = require('atom-space-pen-views'));

  module.exports = Dialog = class Dialog extends View {
    static content({prompt} = {}) {
      return this.div({
        class: 'terminus-dialog'
      }, () => {
        this.label(prompt, {
          class: 'icon',
          outlet: 'promptText'
        });
        this.subview('miniEditor', new TextEditorView({
          mini: true
        }));
        this.label('Escape (Esc) to exit', {
          style: 'width: 50%;'
        });
        return this.label('Enter (\u21B5) to confirm', {
          style: 'width: 50%; text-align: right;'
        });
      });
    }

    initialize({iconClass, placeholderText, stayOpen} = {}) {
      if (iconClass) {
        this.promptText.addClass(iconClass);
      }
      atom.commands.add(this.element, {
        'core:confirm': () => {
          return this.onConfirm(this.miniEditor.getText());
        },
        'core:cancel': () => {
          return this.cancel();
        }
      });
      if (!stayOpen) {
        this.miniEditor.on('blur', () => {
          return this.close();
        });
      }
      if (placeholderText) {
        this.miniEditor.getModel().setText(placeholderText);
        return this.miniEditor.getModel().selectAll();
      }
    }

    attach() {
      this.panel = atom.workspace.addModalPanel({
        item: this.element
      });
      this.miniEditor.focus();
      return this.miniEditor.getModel().scrollToCursorPosition();
    }

    close() {
      var panelToDestroy;
      panelToDestroy = this.panel;
      this.panel = null;
      if (panelToDestroy != null) {
        panelToDestroy.destroy();
      }
      return atom.workspace.getActivePane().activate();
    }

    cancel() {
      return this.close();
    }

  };

}).call(this);