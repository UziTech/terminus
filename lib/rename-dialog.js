(function() {
  var Dialog, RenameDialog;

  Dialog = require("./dialog");

  module.exports = RenameDialog = class RenameDialog extends Dialog {
    constructor(statusIcon) {
      super({
        prompt: "Rename",
        iconClass: "icon-pencil",
        placeholderText: statusIcon.getName()
      });
      this.statusIcon = statusIcon;
    }

    onConfirm(newTitle) {
      this.statusIcon.updateName(newTitle.trim());
      return this.cancel();
    }

  };

}).call(this);