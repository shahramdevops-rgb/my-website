// Theme toggle button (_ThemeToggle). It is rendered invisible: without JS it could do nothing, so it appears
// only once Alpine runs — visibility rather than display, so its space is kept and the header doesn't shift.
export default () => ({
  init() {
    this.$el.classList.remove("invisible");
  },

  // The button means "light theme": pressed while the light theme is on.
  get pressed() {
    return String(this.$store.theme.isLight);
  },

  toggle() {
    this.$store.theme.toggle();
  },
});
