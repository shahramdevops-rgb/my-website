// Mobile menu (_Header): enhances the native <details>, which already opens and closes without JS.
// Adds what <details> lacks: Escape and a click outside the menu close it.
export default () => ({
  close() {
    this.$root.open = false;
  },

  // Escape: if focus was inside the menu, put it back on the toggle — otherwise it would vanish with the menu.
  closeFromKeyboard() {
    if (!this.$root.open) {
      return;
    }

    const hadFocus = this.$root.contains(document.activeElement);
    this.close();
    if (hadFocus) {
      this.$refs.toggle.focus();
    }
  },
});
