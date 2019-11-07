(function() {
  var Terminus;

  Terminus = require('../lib/terminus');

  // Use the command `window:run-package-specs` (cmd-alt-ctrl-p) to run specs.

  // To run a specific `it` or `describe` block add an `f` to the front (e.g. `fit`
  // or `fdescribe`). Remove the `f` to unfocus the block.
  describe("Terminus", function() {
    var activationPromise, workspaceElement;
    [workspaceElement, activationPromise] = [];
    beforeEach(function() {
      workspaceElement = atom.views.getView(atom.workspace);
      return activationPromise = atom.packages.activatePackage('terminus');
    });
    return describe("when the terminus:toggle event is triggered", function() {
      it("hides and shows the modal panel", function() {
        // Before the activation event the view is not on the DOM, and no panel
        // has been created
        expect(workspaceElement.querySelector('.terminus')).not.toExist();
        // This is an activation event, triggering it will cause the package to be
        // activated.
        atom.commands.dispatch(workspaceElement, 'terminus:toggle');
        waitsForPromise(function() {
          return activationPromise;
        });
        return runs(function() {
          var TerminusElement, statusBar;
          expect(workspaceElement.querySelector('.terminus')).toExist();
          TerminusElement = workspaceElement.querySelector('.terminus');
          expect(TerminusElement).toExist();
          statusBar = atom.workspace.panelForItem(TerminusElement);
          expect(statusBar.isVisible()).toBe(true);
          atom.commands.dispatch(workspaceElement, 'terminus:toggle');
          return expect(statusBar.isVisible()).toBe(false);
        });
      });
      return it("hides and shows the view", function() {
        // This test shows you an integration test testing at the view level.

        // Attaching the workspaceElement to the DOM is required to allow the
        // `toBeVisible()` matchers to work. Anything testing visibility or focus
        // requires that the workspaceElement is on the DOM. Tests that attach the
        // workspaceElement to the DOM are generally slower than those off DOM.
        jasmine.attachToDOM(workspaceElement);
        expect(workspaceElement.querySelector('.terminus')).not.toExist();
        // This is an activation event, triggering it causes the package to be
        // activated.
        atom.commands.dispatch(workspaceElement, 'terminus:toggle');
        waitsForPromise(function() {
          return activationPromise;
        });
        return runs(function() {
          var TerminusElement;
          // Now we can test for view visibility
          TerminusElement = workspaceElement.querySelector('.terminus');
          expect(TerminusElement).toBeVisible();
          atom.commands.dispatch(workspaceElement, 'terminus:toggle');
          return expect(TerminusElement).not.toBeVisible();
        });
      });
    });
  });

}).call(this);