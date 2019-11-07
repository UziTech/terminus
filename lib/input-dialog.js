(function() {
  var Dialog, InputDialog, os;

  Dialog = require("./dialog");

  os = require("os");

  module.exports = InputDialog = class InputDialog extends Dialog {
    constructor(terminalView) {
      super({
        prompt: "Insert Text",
        iconClass: "icon-keyboard",
        stayOpen: true
      });
      this.terminalView = terminalView;
    }

    onConfirm(input) {
      var data, eol;
      if (atom.config.get('terminus.toggles.runInsertedText')) {
        eol = os.EOL;
      } else {
        eol = '';
      }
      data = `${input}${eol}`;
      this.terminalView.input(data);
      return this.cancel();
    }

  };

}).call(this);